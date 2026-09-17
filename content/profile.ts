import { Profile } from "./schema";

export const profile: Profile = Profile.parse({
  name: "Anusha Upadhyay",
  role: "Machine learning systems for messy, high-stakes data.",
  location: "Raleigh, North Carolina",
  available: "Full time from January 2027", // TODO confirm
  status: ["US citizen", "No sponsorship required"],
});
