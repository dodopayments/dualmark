import type { OpenAPIDocument } from "../../src/api-reference.js";

const petstoreSpec = {
  openapi: "3.1.0",
  info: {
    title: "Petstore",
    version: "1.0.0",
  },
  paths: {
    "/pet": {
      post: {
        operationId: "addPet",
        summary: "Add a new pet to the store",
        description: "Creates a pet resource from the supplied JSON payload.",
        tags: ["pet"],
        requestBody: {
          description: "Pet payload to create.",
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Pet",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Pet",
                },
              },
            },
          },
          "405": {
            description: "Invalid input",
          },
        },
        "x-codeSamples": [
          {
            lang: "curl",
            label: "curl",
            source:
              "curl -X POST https://petstore.example.com/pet -H \"Content-Type: application/json\" -d '{\"name\":\"doggie\"}'",
          },
          {
            lang: "javascript",
            label: "JavaScript",
            source:
              "await fetch(\"https://petstore.example.com/pet\", { method: \"POST\", headers: { \"Content-Type\": \"application/json\" }, body: JSON.stringify({ name: \"doggie\" }) });",
          },
        ],
      },
    },
    "/pet/{petId}": {
      get: {
        operationId: "getPetById",
        summary: "Find pet by ID",
        description: "Returns a single pet.",
        tags: ["pet"],
        parameters: [
          {
            name: "petId",
            in: "path",
            description: "ID of pet to return",
            required: true,
            schema: {
              type: "integer",
              format: "int64",
            },
          },
        ],
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Pet",
                },
              },
            },
          },
          "404": {
            description: "Pet not found",
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: "object",
        required: ["name", "photoUrls"],
        properties: {
          id: {
            type: "integer",
            format: "int64",
            description: "Unique pet identifier.",
          },
          name: {
            type: "string",
            description: "Display name for the pet.",
          },
          status: {
            type: "string",
            description: "Availability state.",
            enum: ["available", "pending", "sold"],
          },
          photoUrls: {
            type: "array",
            description: "Photo URLs for the pet.",
            items: {
              type: "string",
            },
          },
          category: {
            type: "object",
            description: "Grouping information.",
            properties: {
              id: {
                type: "integer",
                format: "int64",
              },
              name: {
                type: "string",
              },
            },
          },
          tags: {
            type: "array",
            description: "Tags attached to the pet.",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "integer",
                  format: "int64",
                },
                name: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies OpenAPIDocument;

export default petstoreSpec;
