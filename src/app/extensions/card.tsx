import { hubspot, Flex, Text, LoadingSpinner } from "@hubspot/ui-extensions";
import { useEffect, useState, useCallback } from "react";

interface CustomObject {
  id: string;
  name?: string;
}

interface ExtensionProps {
  context: any;
  actions: any;
  runServerlessFunction: (params: any) => Promise<any>;
}

hubspot.extend(({ context, actions, runServerlessFunction }: any) => (
  <ShippingAddress
    context={context}
    actions={actions}
    runServerlessFunction={runServerlessFunction}
  />
));

const ShippingAddress = ({
  context,
  runServerlessFunction,
}: ExtensionProps) => {
  if (!("crm" in context)) {
    return <Text>This extension only works in CRM records.</Text>;
  }

  const dealId = context.crm.objectId; // Current CRM record is assumed to be a deal

  const [customObjects, setCustomObjects] = useState<CustomObject[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);

  const fetchShippingAddresses = useCallback(async () => {
    if (!dealId) return;
    setLoadingObjects(true);
    try {
      // Call your serverless function to fetch associated contacts first
      const contactsData = await runServerlessFunction({
        name: "fetchAssociatedContacts",
        parameters: { dealId },
      });

      const contacts = contactsData?.response?.data || [];
      if (!contacts.length) {
        setCustomObjects([]);
        return;
      }

      // Collect all shipping addresses from associated contacts
      const allAddresses: CustomObject[] = [];

      for (const contact of contacts) {
        const addressesData = await runServerlessFunction({
          name: "fetchAssociatedCustomObjects",
          parameters: {
            contactId: contact.id,
            customObjectType: "2-35211388", // Replace with your shipping address custom object type
          },
        });

        const addresses = addressesData?.response?.data || [];
        allAddresses.push(...addresses);
      }

      setCustomObjects(allAddresses);
    } catch (err) {
      console.error("Error fetching shipping addresses:", err);
      setCustomObjects([]);
    } finally {
      setLoadingObjects(false);
    }
  }, [dealId, runServerlessFunction]);

  useEffect(() => {
    fetchShippingAddresses();
  }, [fetchShippingAddresses]);

  return (
    <Flex direction="column" gap="md" wrap="nowrap">
      <Text format={{ fontWeight: "bold" }}>Associated Shipping Addresses</Text>
      {loadingObjects ? (
        <LoadingSpinner label="Loading shipping addresses..." />
      ) : customObjects.length === 0 ? (
        <Text>No shipping addresses associated with this deal.</Text>
      ) : (
        customObjects.map((obj) => (
          <Text key={obj.id}>Name : {obj.name || obj.id}</Text>
        ))
      )}
    </Flex>
  );
};

export default ShippingAddress;
