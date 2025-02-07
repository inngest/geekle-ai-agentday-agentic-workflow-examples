/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import {
  createAgent,
  createTool,
  createNetwork,
  openai,
  State,
  getDefaultRoutingAgent,
} from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter";

import { inngest } from "./client";
import { MAP_FIELDS } from "@/types/contact";

function objectsToCSV(array: any) {
  const headers = Object.keys(array[0]).join(",");
  const rows = array.map((item: any) => Object.values(item).join(","));
  return [headers, ...rows].join("\n");
}

const contactsMapperAgent = createAgent({
  name: "contacts-mapper",
  description: "Map the contacts to valid properties",
  system: ({ network }) => `
    You are a contacts mapper agent that maps the contacts from the following properties: ${Object.keys(
      network?.state.kv.get("contacts")[0] as any
    ).join(", ")} , to the following properties: ${MAP_FIELDS.join(", ")}

    Generate a javascript program that will prints the transformed CSV file located in /home/user/contacts.csv as a JSON array.

    IMPORTANT: The program should be able to run without npm dependencies.
  `,
  tool_choice: "transform-contacts",
  tools: [
    createTool({
      name: "transform-contacts",
      description:
        "Run the provided javascript code to transform the contacts into a format that can be imported. The contact file is available at /home/user/contacts.csv",
      parameters: z.object({
        code: z.string(),
      }),
      handler: async ({ code }, { network }) => {
        const sbx = await Sandbox.create();
        try {
          await sbx.files.write(
            "/home/user/contacts.csv",
            objectsToCSV(network?.state.kv.get("contacts") as any)
          );
          const execution = await sbx.runCode(code, { language: "js" });
          if (execution.logs.stdout.length > 0) {
            const mappedContacts = JSON.parse(
              (execution.logs.stdout?.join("") || "").replace(`\n`, "")
            );
            network?.state.kv.set("mapped-contacts", mappedContacts);
            return "Contacts mapped!";
          } else if (execution.error) {
            const { name, traceback } = execution.error;
            return `${name}: \n ${traceback}`;
          }
        } catch (error) {
          return `Could not transform contacts: ${error}`;
        } finally {
          await sbx.kill();
        }
      },
    }),
  ],
});

const contactsImporterNetwork = createNetwork({
  name: "contacts-importer",
  agents: [contactsMapperAgent],
  maxIter: 5,
  defaultModel: openai({
    model: "gpt-4o",
  }),
  defaultRouter: ({ network }) => {
    return network?.state.kv.get("mapped-contacts")
      ? undefined
      : getDefaultRoutingAgent();
  },
});

export const contactImporter = inngest.createFunction(
  {
    id: "contact-importer",
  },
  {
    event: "contacts.import",
  },
  async ({ event }) => {
    const result = await contactsImporterNetwork.run(
      `Map the provided contacts list to be imported as valid contacts and rank from 1-10 based ${
        event.data.rankingCriteria || "on their job title."
      }`,
      {
        state: new State({ contacts: event.data.contacts }),
      }
    );
    return result.state.kv.get("mapped-contacts");
  }
);
