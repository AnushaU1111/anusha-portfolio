import { Milestone } from "./schema";

/**
 * The About section's copy and timeline.
 *
 * The timeline replaces a three-item stat block that only said where she is
 * now. It runs newest first and carries education, work and coursework
 * projects in one sequence rather than three lists, because the interleaving
 * is the point: the projects happen during the degree, and two of them ran in
 * the same semester.
 *
 * Every row is taken from the résumé, `when` strings included, so the page and
 * the PDF a visitor downloads say the same thing.
 */
export const timeline: Milestone[] = [
  { when: "Expected Dec 2026", what: "MS Computer Science, Data Science concentration", where: "NC State University", kind: "study" },
  { when: "Jun – Aug 2026", what: "Software Engineering Intern, AI evaluation", where: "Neuraluna AI", kind: "work" },
  { when: "Feb 2026 – now", what: "Research Assistant, applied ML and software", where: "NC State University", kind: "work" },
  { when: "Jan – May 2026", what: "Wearable acoustic event classification", where: "NC State University", kind: "project" },
  { when: "Jan – May 2026", what: "Skin cancer screening ensemble", where: "NC State University", kind: "project" },
  { when: "Aug – Dec 2025", what: "ReqTrace, requirements intelligence", where: "NC State University", kind: "project" },
  { when: "Jan – May 2025", what: "Research Assistant, multilingual medical RAG", where: "Temple University", kind: "work" },
  { when: "2021 – 2025", what: "B.Tech Computer Science and Engineering", where: "VIT Vellore", kind: "study" },
  { when: "2022 – 2024", what: "Web Developer and UX Designer", where: "IET Vellore", kind: "work" },
].map((m) => Milestone.parse(m));

export const about = {
  index: "01",
  headline: ["I work where", "the data is messy."] as const,
  body: [
    "I'm a US citizen and a master's student in computer science at NC State, concentrating in data science. Before that, a B.Tech at VIT Vellore and a semester of research at Temple.",
    "Most of what I build starts with a pile of data nobody has made sense of yet. A million social media posts. A thousand medical documents in more than one language. Chest-microphone recordings from ten people.",
  ],
  pull: "What I care about is what happens after the model runs. Does the number hold on a subject it has never heard? I treat evaluation as the work, not the paperwork at the end of it.",
  /**
   * Kept out of the paragraphs and set as its own line. Inside the argument
   * about evaluation it read as filler; as a labelled row it is the ordinary
   * thing a portfolio says about the person and costs the reader nothing.
   */
  interests: ["sketching", "reading", "boxing"],
  throughLine:
    "Thresholds chosen from what a mistake costs, per-class numbers read before the average, test sets built from subjects the model has never seen. Every figure here traces back to a report, a repository or a poster.",
  timeline,
};

export const contact = {
  headline: ["If you have messy data,", "I would like to see it."] as const,
  lede: "Graduating in December 2026 and looking for machine learning engineering, applied AI and evaluation roles.",
};
