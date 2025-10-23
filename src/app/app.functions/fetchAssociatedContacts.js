const hubspot = require("@hubspot/api-client");

exports.main = async (context = {}) => {
  const { dealId } = context.parameters;

  if (!dealId) {
    return { statusCode: 200, data: [] };
  }

  const client = new hubspot.Client({
    accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN,
  });

  try {
    const associations = await client.crm.deals.associationsApi.getAll(
      dealId,
      "contacts"
    );

    const contactIds = associations.results.map((a) => a.id);

    if (!contactIds.length) {
      console.warn(`No contacts associated with deal ${dealId}`);
      return { statusCode: 200, data: [] };
    }

    const contactsResponse = await client.crm.contacts.batchApi.read({
      properties: ["firstname", "lastname", "email"],
      inputs: contactIds.map((id) => ({ id })),
    });

    const contacts = contactsResponse.results.map((record) => {
      const contact = {
        id: record.id,
        properties: {
          firstname: record.properties?.firstname || null,
          lastname: record.properties?.lastname || null,
          email: record.properties?.email || null,
        },
      };
      return contact;
    });

    if (!contacts.length) {
      console.warn(`Batch API returned no contact records for deal ${dealId}`);
      return { statusCode: 200, data: [] };
    }

    return { statusCode: 200, data: contacts };
  } catch (err) {
    console.error("Error fetching contacts:", err);
    return { statusCode: 200, data: [] };
  }
};
