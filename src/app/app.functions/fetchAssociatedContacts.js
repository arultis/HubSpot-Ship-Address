const hubspot = require("@hubspot/api-client");

exports.main = async (context = {}) => {
  const { dealId } = context.parameters;

  if (!dealId) {
    console.warn(" No dealId provided in parameters.");
    return { statusCode: 200, data: [] };
  }

  const client = new hubspot.Client({
    accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN,
  });

  try {
    const batchRequest = {
      inputs: [{ id: dealId }],
      limit: 100,
    };

    const associations = await client.crm.associations.v4.batchApi.getPage(
      "deals",
      "contacts",
      batchRequest
    );

    // Use toObjectId instead of id
    const contactIds = [];
    associations.results.forEach((item) => {
      item.to.forEach((assoc) => {
        contactIds.push(assoc.toObjectId);
      });
    });

    if (!contactIds.length) {
      console.warn(` No contacts associated with deal ${dealId}`);
      return { statusCode: 200, data: [] };
    }

    const contactsResponse = await client.crm.contacts.batchApi.read({
      properties: ["firstname", "lastname", "email"],
      inputs: contactIds.map((id) => ({ id })),
    });

    const contacts = contactsResponse.results.map((record) => ({
      id: record.id,
    }));

    return { statusCode: 200, data: contacts };
  } catch (err) {
    console.error(" Error fetching contacts:", err);
    return { statusCode: 200, data: [] };
  }
};
