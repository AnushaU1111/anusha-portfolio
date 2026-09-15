import { Profile } from "./schema";

export const profile: Profile = Profile.parse({
  name: "Anusha Upadhyay",
  role: "Machine learning systems for messy, high-stakes data.",
  location: "Raleigh, North Carolina",
  available: "Full time from January 2027", // TODO confirm
  status: ["US citizen", "No sponsorship required"],
  now: "MS Computer Science, NC State University",
  recently: "AI Evaluation Engineering, Neuraluna AI",
  focus: "Applied ML, NLP and model evaluation",
});
