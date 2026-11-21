import { describe, expect, it } from "vitest";
import { formContext } from "@/lib/forms/context";
import { currentPersona, personaFromAnswers } from "@/lib/guide/persona";
import { planTimeline } from "@/lib/guide/timeline";
import { loadJourney } from "@/lib/knowledge";
import { defaultParams } from "@/lib/params";
import { personas } from "@/lib/mock/personas";
import type { TimelineEvent } from "@/lib/events";

describe("family plan handoffs", () => {
  it("opens the pregnancy claim once the guide user records sick leave", async () => {
    const answers = { situation: "pregnant", role: "mother", insurance: ["business"], voluntarySickness: true };
    const persona = personaFromAnswers(answers);
    const sick: TimelineEvent = { id: "sick", type: "sickLeave", who: "mother", source: "new", date: "2026-11-20", endDate: null, title: "Zwolnienie w ciąży", description: "" };
    const get = async (events: TimelineEvent[]) => formContext(persona, events, null, defaultParams, await loadJourney(), [], "2026-11-21", "sickness-claim", answers);
    expect(await get(persona.events)).toBeNull();
    const found = await get([...persona.events, sick]);
    expect(found?.entry).toMatchObject({ form: "ff.zas53" });
    expect(found?.ctx).toMatchObject({ recipient: "zus", waitingFor: [] });
  });

  it("anchors the demo birth-card prerequisite to the recorded birth", async () => {
    const profile = personas[0];
    const birth: TimelineEvent = { id: "recorded", type: "birth", who: "both", source: "new", date: "2027-03-14", title: "Poród", description: "" };
    const events = [...profile.events, birth];
    const persona = currentPersona({ personaId: profile.id, guideAnswers: {}, events })!;
    const timeline = planTimeline(persona, events, null, defaultParams, await loadJourney(), ["birth-card"], "2027-03-15");
    expect(timeline.find((entry) => entry.id === "birth-card")?.requires).toEqual(["event-recorded"]);
    expect(timeline.find((entry) => entry.id === "birth-registration")?.status).toBe("ready");
    expect(timeline.filter((entry) => entry.kind === "event" && entry.title.includes("Narodziny"))).toHaveLength(0);
  });

  it("shows only the exceptional forms tied to a recorded circumstance", async () => {
    const profile = personas[0];
    const journey = await loadJourney();
    const timeline = (events: TimelineEvent[]) => planTimeline(profile, events, null, defaultParams, journey, [], "2027-06-15");
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
