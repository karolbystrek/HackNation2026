import { describe, expect, it } from "vitest";
import { formContext } from "@/lib/forms/context";
import { currentPersona, personaFromAnswers } from "@/lib/guide/persona";
import { planTimeline } from "@/lib/guide/timeline";
import { defaultParams } from "@/lib/params";
import { personas } from "@/lib/mock/personas";
import type { TimelineEvent } from "@/lib/events";

describe("family plan handoffs", () => {
  it("unlocks the pregnancy claim once the guide user confirms e-ZLA", () => {
    const answers = { situation: "pregnant", role: "mother", insurance: ["business"], voluntarySickness: true };
    const persona = personaFromAnswers(answers);
    const get = (done: string[]) => formContext(persona, [], null, defaultParams, done, "2026-11-21", "sick-claim-zas53", answers);
    expect(get([])?.entry).toMatchObject({ form: "ff.zas53", status: "blocked" });
    expect(get(["sick-ezla"])?.ctx).toMatchObject({ recipient: "zus", waitingFor: [] });
  });

  it("anchors the demo birth-card prerequisite to the recorded birth", () => {
    const profile = personas[0];
    const birth: TimelineEvent = { id: "recorded", type: "birth", who: "both", source: "new", date: "2027-03-14", title: "Poród", description: "" };
    const events = [...profile.events, birth];
    const persona = currentPersona({ personaId: profile.id, guideAnswers: {}, events })!;
    const timeline = planTimeline(persona, events, null, defaultParams, ["birth-card"], "2027-03-15", {});
    expect(timeline.find((entry) => entry.id === "birth-card")?.requires).toEqual(["event-recorded"]);
    expect(timeline.find((entry) => entry.id === "birth-registration")?.status).toBe("ready");
    expect(timeline.filter((entry) => entry.kind === "event" && entry.title.includes("Narodziny"))).toHaveLength(0);
  });

  it("shows only the exceptional forms tied to a recorded circumstance", () => {
    const profile = personas[0];
    const timeline = (events: TimelineEvent[]) => planTimeline(profile, events, null, defaultParams, [], "2027-06-15", {});
    const forms = (events: TimelineEvent[]) => timeline(events).flatMap((entry) => entry.form ? [entry.form] : []);
    expect(forms(profile.events)).not.toContain("ff.z3a");
    expect(forms(profile.events)).not.toContain("ff.z3");
    expect(forms(profile.events)).not.toContain("ff.zas40");
    expect(forms(profile.events)).not.toContain("lr.maternity_mother_death");
    const hospital: TimelineEvent = {
      id: "hospital", type: "circumstance", circumstance: "motherHospital", date: "2027-06-15",
      who: "both", source: "new", title: "Pobyt matki w szpitalu", description: "",
    };
    const events = [...profile.events, hospital];
    expect(timeline(events).find((entry) => entry.form === "ff.zas40")).toMatchObject({ date: hospital.date, trigger: hospital });
    expect(forms(events)).toContain("lr.maternity_mother_hospital");
    expect(forms(events)).not.toContain("lr.maternity_mother_death");
    expect(forms(events)).not.toContain("ff.zas55");
  });

});
