/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
"use server";

import { OpenAI } from "openai";
import { Contact, MAP_FIELDS } from "./types/contact";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function importContacts(contacts: any[]) {
  // Agentic workflow

  // 1. Emit a mapping object if columns are not matching
  const mapping = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `Return a JSON object to map the following contact properties: ${Object.keys(
          contacts[0]
        ).join(", ")} to the following properties: ${JSON.stringify(
          MAP_FIELDS.filter((field) => field !== "ranking")
        )}.
        
        Important:
          - only a 1-1 mapping is allowed.
          - only return a mapping if necessary, otherwise return an empty object.`,
      },
    ],
  });

  console.log("content", mapping.choices[0].message.content);

  const content = mapping.choices[0].message.content;
  console.log(
    "content",
    mapping.choices[0].message.content?.match(/```json(.*)```/)
  );

  // extract the json object wrapped in ```json tags, ex:
  // ```json
  // {
  //   "fullName": "firstName lastName",
  //   "email": "email",
  //   "position": "jobTitle",
  //   "company": "company"
  // }
  // ```
  const mappingObject = JSON.parse(
    content?.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || "{}"
  );

  console.log("mappingObject", mappingObject);

  // 2. Transform the contacts using the mapping object
  const transformedContacts: Contact[] =
    Object.keys(mappingObject).length > 0
      ? contacts.map((contact) => {
          return Object.keys(contact).reduce((acc, key) => {
            if (mappingObject[key]) {
              // @ts-ignore
              acc[mappingObject[key]] = contact[key];
            }
            return acc;
          }, {} as Contact);
        })
      : contacts;

  // 3. Fill the rank property based on the job title
  const rankedContacts = transformedContacts.map((contact) => {
    return {
      ...contact,
      rank: contact.position,
    };
  });

  return rankedContacts;
}
