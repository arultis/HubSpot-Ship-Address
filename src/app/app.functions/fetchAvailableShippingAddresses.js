const hubspot = require("@hubspot/api-client");

exports.main = async (context = {}) => {
  const { dealId, customObjectType } = context.parameters;

  console.log("Received parameters:", { dealId, customObjectType });

  if (!dealId || !customObjectType) {
    console.warn("Missing dealId or customObjectType");
    return { statusCode: 200, data: [] };
  }

  const client = new hubspot.Client({
    accessToken: context.secrets.PRIVATE_APP_ACCESS_TOKEN,
  });

  try {
    // Get all custom objects associated with the deal
    const associations = await client.crm.deals.associationsApi.getAll(
      dealId,
      customObjectType
    );
    console.log("Associations fetched from deal:", associations);

    const associatedIds = associations.results.map((a) => a.id);
    console.log("Associated object IDs:", associatedIds);

    // Fetch all custom objects of this type
    const allObjectsResponse = await client.crm.objects.basicApi.getPage(
      customObjectType,
      100,
      undefined,
      ["name"]
    );
    console.log("All objects fetched:", allObjectsResponse.results);

    // Filter out objects already associated with the deal
    const availableObjects = allObjectsResponse.results
      .filter((obj) => !associatedIds.includes(obj.id))
      .map((obj) => ({
        id: obj.id,
        name: obj.properties.name || obj.id,
      }));

    console.log("Available objects after filtering:", availableObjects);

    return { statusCode: 200, data: availableObjects };
  } catch (err) {
    console.error("Error fetching available shipping addresses:", err);
    return { statusCode: 200, data: [] };
  }
};
