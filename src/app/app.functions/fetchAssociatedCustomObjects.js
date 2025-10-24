const hubspot = require("@hubspot/api-client");

exports.main = async (context = {}) => {
  const { contactId, customObjectType } = context.parameters;

  if (!contactId || !customObjectType) {
    console.warn(" Missing contactId or customObjectType");
    return { statusCode: 200, data: [] };
  }

  const client = new hubspot.Client({
    accessToken: context.secrets.PRIVATE_APP_ACCESS_TOKEN,
  });

  try {
    // Fetch associated custom objects
    const associations = await client.crm.associations.v4.basicApi.getPage(
      "contacts",
      contactId,
      customObjectType
    );

    // Extract associated object IDs directly
    const objectIds = associations.results.map((item) => item.toObjectId);

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

    const objects = batchResponse.results.map((record) => ({
      id: record.id,
      name: record.properties?.name || record.id,
    }));

    return { statusCode: 200, data: objects };
  } catch (err) {
    console.error("Error fetching custom objects:", err);
    return { statusCode: 200, data: [] };
  }
};
