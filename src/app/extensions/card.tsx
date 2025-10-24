import {
  hubspot,
  Flex,
  Dropdown,
  Text,
  Button,
  LoadingSpinner,
} from "@hubspot/ui-extensions";
import { useEffect, useState, useCallback, useMemo } from "react";

interface CustomObject {
  id: string;
  name?: string;
  properties?: Record<string, any>;
}

interface ExtensionProps {
  context: any;
  runServerlessFunction: (params: any) => Promise<any>;
}

// Attach extension to HubSpot UI
hubspot.extend(({ context, runServerlessFunction }: any) => (
  <ShippingAddressCard
    context={context}
    runServerlessFunction={runServerlessFunction}
  />
));

const ShippingAddressCard = ({
  context,
  runServerlessFunction,
}: ExtensionProps) => {
  if (!context?.crm?.objectId) {
    return <Text>This extension only works in CRM records.</Text>;
  }

  const dealId = context.crm.objectId;

  const [addresses, setAddresses] = useState<CustomObject[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [associating, setAssociating] = useState(false);

  // Fetch all addresses associated with contacts of the deal
  const fetchAddresses = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);

    try {
      console.log(`🔹 Fetching contacts for deal ${dealId}...`);

      const contactsData = await runServerlessFunction({
        name: "fetchAssociatedContacts",
        parameters: { dealId },
      });

      const contacts = contactsData?.response?.data || [];
      console.log(`🔹 Found ${contacts.length} contacts`);

      if (!contacts.length) {
        setAddresses([]);
        return;
      }

      const addressesArrays = await Promise.all(
        contacts.map((contact: { id: any }) =>
          runServerlessFunction({
            name: "fetchAssociatedCustomObjects",
            parameters: {
              contactId: contact.id,
              customObjectType: "2-35211388",
            },
          })
        )
      );

      // Flatten and deduplicate addresses
      const allAddresses: CustomObject[] = addressesArrays
        .flatMap((res) => res?.response?.data || [])
        .filter(Boolean);

      const uniqueAddresses = Array.from(
        new Map(allAddresses.map((a) => [a.id, a])).values()
      );

      setAddresses(uniqueAddresses);
    } catch (err) {
      console.error("Error fetching addresses:", err);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [dealId, runServerlessFunction]);

  // Memoized map for fast dropdown label lookup
  const addressMap = useMemo(
    () => new Map(addresses.map((a) => [a.id, a])),
    [addresses]
  );

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const getAddressLabel = (obj: CustomObject) =>
    obj.name || obj.properties?.name || obj.id;

  const associateAddressWithDeal = async () => {
    if (!selectedAddressId) return;
    setAssociating(true);

    try {
      await runServerlessFunction({
        name: "associateCustomObjectWithDeal",
        parameters: {
          dealId,
          customObjectType: "2-35211388",
          customObjectId: selectedAddressId,
        },
      });

      setSelectedAddressId("");
      await fetchAddresses();
    } catch (err) {
      console.error("Error associating address:", err);
    } finally {
      setAssociating(false);
    }
  };

  return (
    <Flex direction="column" gap="md" wrap="nowrap">
      <Text format={{ fontWeight: "bold" }}>
        Shipping Addresses (via Contacts)
      </Text>

      {loading ? (
        <LoadingSpinner label="Loading addresses..." />
      ) : addresses.length === 0 ? (
        <Text>No shipping addresses found for this deal's contacts.</Text>
      ) : (
        <>
          <Dropdown
            buttonText={
              selectedAddressId
                ? getAddressLabel(addressMap.get(selectedAddressId)!)
                : "Select Shipping Address"
            }
            options={addresses.map((obj) => ({
              label: getAddressLabel(obj),
              value: obj.id,
              onClick: () => setSelectedAddressId(obj.id),
            }))}
          />
          <Button
            onClick={associateAddressWithDeal}
            disabled={!selectedAddressId || associating}
          >
            {associating ? "Associating..." : "Add Association to Deal"}
          </Button>
        </>
      )}
    </Flex>
  );
};

export default ShippingAddressCard;
