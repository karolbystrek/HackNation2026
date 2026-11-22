import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Condition } from "@/lib/forms/spec";
import type { Deadline, Journey, JourneyStep, StepDocument } from "@/lib/journey";

// knowledge/ sits next to app/ in the repo and is mounted at /knowledge in the container.
const KNOWLEDGE_DIR = path.join(process.cwd(), "..", "knowledge");

// Loose view of knowledge/ records; the JSON Schemas in knowledge/schema are the contract.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KnowledgeRecord = Record<string, any> & { id: string };

export async function records(file: string): Promise<KnowledgeRecord[]> {
  "use cache";
  return JSON.parse(await readFile(path.join(KNOWLEDGE_DIR, file), "utf8")).records;
}

type RawAttachment = { document_id: string; required: "always" | "conditional"; condition?: Condition };

/** Attachments that apply always, or under a condition the app can evaluate. */
function attachments(raw: RawAttachment[] = []): StepDocument[] {
  return raw
    .filter((a) => a.required === "always" || a.condition)
    .map((a) => (a.required === "always" ? { id: a.document_id } : { id: a.document_id, condition: a.condition }));
}

/** The parent-facing part of knowledge/ the timeline and task list are built from. */
export async function loadJourney(): Promise<Journey> {
  "use cache";
  const [scenarios, deadlines, forms, leaveRequests, documents] = await Promise.all(
    ["scenarios.json", "deadlines.json", "forms.json", "leave_requests.json", "documents.json"].map(records),
  );
  const byId = (list: KnowledgeRecord[]) => new Map(list.map((record) => [record.id, record]));
  const formById = byId(forms);
  const leaveById = byId(leaveRequests);
  const docById = byId(documents);

  const toStep = (scenario: string, raw: KnowledgeRecord): JourneyStep => {
    const leave = (raw.leave_request_ids ?? []).map((id: string) => leaveById.get(id)).find(Boolean);
    // Only forms the parent fills in; payer certificates such as ZAS-15 are the employer's job.
    const form = (raw.form_ids ?? []).map((id: string) => formById.get(id))
      .find((f: KnowledgeRecord | undefined) => f?.field_set_id && f.filled_by?.includes("insured"));
    const documents = leave ? attachments(leave.attachments)
      : form ? attachments(form.attachment_rules)
      : (raw.document_ids ?? []).map((id: string): StepDocument => {
        const needed: Condition[] | null = docById.get(id)?.needed_when ?? null;
        return needed ? { id, condition: { any: needed } } : { id };
      });
    return {
      scenario,
      task: raw.task,
      action: raw.action_pl,
      recipient: raw.recipient,
      condition: raw.condition,
      form: leave ? { id: leave.id } : form ? { id: form.field_set_id, symbol: form.symbol, guide: form.page_url } : undefined,
      documents,
      deadlines: raw.deadline_ids ?? [],
    };
  };

  // form_ids also identifies applications that require a document. Only use
  // the linked form when it is the document's own official template.
  const documentForms: Record<string, string> = {
    "doc.hospital_cert_mother_stay": "form.zas40",
    "doc.adoption_intake_statement": "form.zas26",
    "doc.employer_leave_certificate": "form.zas15",
    "doc.benefit_payer_periods_certificate": "form.zas24",
    "doc.mother_death_abandonment_statement": "form.zas33",
    "doc.payer_cert_employee": "form.z3",
    "doc.payer_cert_non_employee": "form.z3a",
    "doc.after_insurance_statement": "form.z10",
    "doc.health_status_certificate": "form.ol9",
    "doc.occupational_interview": "form.ol10",
  };
  const documentLinks: Record<string, string> = {};
  for (const doc of documents) {
    const form = formById.get(documentForms[doc.id]);
    const href = doc.online_url ?? (form?.status === "current" ? form.page_url : undefined);
    if (href) documentLinks[doc.id] = href;
  }

  const formGuidance: NonNullable<Journey["formGuidance"]> = {};
  for (const form of forms.filter((record) => record.status === "current" && record.field_set_id)) {
    const roles: Record<string, string> = {
      employer: "Pracodawca", payer: "Płatnik składek", payer_of_benefit: "Płatnik zasiłku",
      hospital: "Szpital", doctor: "Lekarz",
    };
    formGuidance[form.field_set_id] = {
      title: form.title_pl,
      summary: form.summary_pl,
      guide: form.page_url,
      preparedBy: form.filled_by?.includes("insured") ? undefined : roles[form.filled_by?.[0]],
    };
  }
  for (const leave of leaveRequests.filter((record) => record.status === "current")) {
    formGuidance[leave.id] = { title: leave.title_pl, summary: leave.summary_pl };
  }

  return {
    formGuidance,
    scenarios: scenarios
      .filter((s) => s.status === "current")
      .map((s) => ({
        id: s.id,
        conditions: s.conditions,
        steps: s.steps.filter((step: KnowledgeRecord) => step.task && step.actor === "insured").map((step: KnowledgeRecord) => toStep(s.id, step)),
      }))
      .filter((s) => s.steps.length > 0),
    deadlines: Object.fromEntries(deadlines.map((d): [string, Deadline] => [d.id, {
      title: d.title_pl, consequence: d.consequence_pl, anchor: d.anchor_event, offset: d.offset, kind: d.kind, appliesTo: d.applies_to ?? null,
    }])),
    documentTitles: Object.fromEntries(documents.map((d) => [d.id, d.title_pl])),
    documentLinks,
    documentInstructions: {
      "doc.e_zla": "Wystawia lekarz.",
      "doc.medical_cert_expected_birth": "Poproś lekarza prowadzącego ciążę.",
      "doc.medical_cert_pregnancy_in_employment": "Poproś lekarza prowadzącego ciążę.",
      "doc.stillbirth_certificate": "Poproś w szpitalu lub położną.",
      "doc.za_zyciem_certificate": "Poproś lekarza specjalistę prowadzącego ciążę lub opiekującego się dzieckiem.",
      "doc.hospital_cert_child_stay": "Poproś w szpitalu.",
    },
  };
}

/** Wizard specs the journey can open: every form or leave request a task step points to. */
export function journeyFormIds(journey: Journey): string[] {
  return [...new Set(journey.scenarios.flatMap((s) => s.steps.flatMap((step) => (step.form ? [step.form.id] : []))))];
}
