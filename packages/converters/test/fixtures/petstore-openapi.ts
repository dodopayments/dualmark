export const PETSTORE_SPEC = {
  openapi: "3.1.0",
  info: { title: "Petstore", version: "1.0.0" },
  paths: {
    "/pets/{petId}": {
      parameters: [
        { name: "petId", in: "path", required: true, schema: { type: "integer" }, description: "ID of pet to return" },
        { name: "tenant", in: "header", required: false, schema: { type: "string" } },
      ],
      get: {
        operationId: "getPetById",
        summary: "Find pet by ID",
        description: "Returns a single pet",
        tags: ["pet"],
        parameters: [
          { name: "tenant", in: "header", required: true, schema: { type: "string" }, description: "Required at operation level" },
        ],
        "x-codeSamples": [{ lang: "curl", label: "cURL", source: "curl -X GET /pets/1" }],
        responses: {
          "200": {
            description: "successful operation",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Pet" },
              },
            },
          },
        },
      },
      post: {
        operationId: "updatePet",
        requestBody: {
          description: "Pet object that needs to be added",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PetUpdate" },
            },
          },
        },
        responses: {
          "200": { description: "successful" },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          photoUrls: { type: "array", items: { type: "string" } },
          category: { $ref: "#/components/schemas/Category" },
          nickname: { type: ["string", "null"] },
        },
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          parent: { $ref: "#/components/schemas/Category" }, // Circular
        },
      },
      PetUpdate: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      },
    },
  },
};
