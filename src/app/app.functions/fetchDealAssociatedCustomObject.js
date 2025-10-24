const hubspot = require("@hubspot/api-client");

exports.main = async (context = {}) => {
  const { dealId, customObjectType } = context.parameters;

  if (!dealId || !customObjectType) {
    console.warn("Missing parameters");
    return { statusCode: 400, message: "Missing parameters" };
  }

  const client = new hubspot.Client({
    accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN,
  });

  try {
    const existingAssociations =
      await client.crm.associations.v4.basicApi.getPage(
        "deals",
        dealId,
        customObjectType
      );

    const existingId = existingAssociations?.results[0]?.toObjectId;

    const data = await client.crm.objects.basicApi.getById(
      customObjectType,
      existingId,
      ["name", "address"]
    );

    return {
      statusCode: 200,
      data,
    };
  } catch (error) {
    console.error("Error fetching data:", error.body || error.message);
    return { statusCode: 200, data: {} };
  }
};
