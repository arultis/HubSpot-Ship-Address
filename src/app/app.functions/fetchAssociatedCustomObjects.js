const hubspot = require("@hubspot/api-client");

exports.main = async (context = {}) => {
  const { contactId, customObjectType } = context.parameters;

  if (!contactId || !customObjectType) {
    console.warn("Missing contactId or customObjectType");
    return { statusCode: 200, data: [] };
  }

  const client = new hubspot.Client({
    accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN,
  });

  try {
    const associations = await client.crm.contacts.associationsApi.getAll(
      contactId,
      customObjectType
    );

    const objectIds = associations.results.map((a) => a.id);

    if (!objectIds.length) {
      console.warn(`No custom objects associated with contact ${contactId}`);
      return { statusCode: 200, data: [] };
    }

    const batchResponse = await client.crm.objects.batchApi.read(
      customObjectType,
      {
        properties: ["name"],
        inputs: objectIds.map((id) => ({ id })),
      }
    );

    const objects = batchResponse.results.map((record) => {
      const obj = {
        id: record.id,
        name: record.properties.name || record.id,
      };
      return obj;
    });

    return { statusCode: 200, data: objects };
  } catch (err) {
    console.error("Error fetching custom objects:", err);
    return { statusCode: 200, data: [] };
  }
};
