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
        content: `Return an object to map the following contact properties: ${Object.keys(
          contacts[0]
        ).join(", ")} to the following properties: ${JSON.stringify(
          MAP_FIELDS
        )}.
        
        Return the object wrapped in <json> tags.`,
      },
    ],
  });

  console.log("result", mapping.choices[0].message.content);

  const mappingObject = JSON.parse(
    mapping.choices[0].message.content
      ?.replace(/^```json\n/, "")
      .replace("\n```", "") || "{}"
  );

  console.log("mappingObject", mappingObject);

  // 2. Transform the contacts using the mapping object
  const transformedContacts: Contact[] = contacts.map((contact) => {
    return Object.keys(contact).reduce((acc, key) => {
      if (mappingObject[key]) {
        // @ts-ignore
        acc[mappingObject[key]] = contact[key];
      }
      return acc;
    }, {} as Contact);
  });

  // 3. Fill the rank property based on the job title
  const rankedContacts = transformedContacts.map((contact) => {
    return {
      ...contact,
      rank: contact.position,
    };
  });

  return rankedContacts;
}
