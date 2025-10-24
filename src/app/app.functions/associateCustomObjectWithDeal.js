const hubspot = require("@hubspot/api-client");

exports.main = async (context = {}) => {
  const { dealId, customObjectId, customObjectType } = context.parameters;

  if (!dealId || !customObjectId || !customObjectType) {
    console.warn("Missing parameters");
    return { statusCode: 400, message: "Missing parameters" };
  }

  const client = new hubspot.Client({
    accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN,
  });

  try {
    const getExistRecord = await client.crm.associations.v4.basicApi.getPage(
      "deals",
      dealId,
      customObjectType
    );

    const isDeletingRecord = getExistRecord?.results[0]?.toObjectId
      ? await client.crm.associations.v4.basicApi.archive(
          "deals",
          dealId,
          customObjectType,
          getExistRecord.results[0].toObjectId
        )
      : "";

    // Create New Association
    await client.crm.associations.v4.basicApi.create(
      "deals",
      dealId,
      customObjectType,
      customObjectId,
      [
        {
          associationCategory: "USER_DEFINED",
          associationTypeId: 62, // change
        },
      ]
    );

    return { statusCode: 200, message: "Association added successfully" };
  } catch (err) {
    return { statusCode: 200, message: err.message };
  }
};
