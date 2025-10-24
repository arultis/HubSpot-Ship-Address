const hubspot = require("@hubspot/api-client");

exports.main = async (context = {}) => {
  const { dealId, customObjectId, customObjectType } = context.parameters;

  console.log("Received parameters:", {
    dealId,
    customObjectType,
    customObjectId,
  });

  if (!dealId || !customObjectId || !customObjectType) {
    console.warn("Missing parameters");
    return { statusCode: 400, message: "Missing parameters" };
  }

  const client = new hubspot.Client({
    accessToken: context.secrets.PRIVATE_APP_ACCESS_TOKEN,
  });

  try {
    console.log(
      `Creating association: Deal ${dealId} -> ${customObjectType} ${customObjectId}`
    );

    // Correct usage of create method
    const response = await client.crm.associations.v4.basicApi.create(
      "deals", // fromObjectType
      dealId, // fromObjectId
      customObjectType, // toObjectType
      customObjectId, // toObjectId
      [
        {
          associationCategory: "USER_DEFINED",
          associationTypeId: 40,
        },
      ]
    );

    console.log("Association API response:", response);

    return { statusCode: 200, message: "Association added successfully" };
  } catch (err) {
    console.log("Error creating association:", err);
    return { statusCode: 500, message: err.message };
  }
};
