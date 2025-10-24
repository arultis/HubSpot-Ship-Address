import { hubspot, Flex, Dropdown, Text, Button, LoadingSpinner, CrmContext } from "@hubspot/ui-extensions";
import { useEffect, useState, useCallback, useMemo } from "react";
import { ExtensionProps, CustomObject, Response } from "./interfaces/card";

hubspot.extend(({ context, runServerlessFunction }) => <ShippingAddressCard context={context} runServerlessFunction={runServerlessFunction} />);

const ShippingAddressCard = ({ context, runServerlessFunction }: ExtensionProps) => {
  const dealId = (context as CrmContext).crm?.objectId;

  const [addresses, setAddresses] = useState<CustomObject[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [associatedAddress, setAssociatedAddress] = useState<CustomObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [associating, setAssociating] = useState(false);

  // Returns label in "Name - Address" format
  const getAddressLabel = (obj: CustomObject) => {
    const name = obj.name || obj.properties?.name || "";

    const address = obj.properties?.address || "";

    const addressName = address ? `${name} - ${address}` : name;

    return addressName;
  };

  // Fetch all addresses from contacts
  const fetchAddresses = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);

    try {
      const contactsData: any | Response = await runServerlessFunction({
        name: "fetchAssociatedContacts",
        parameters: { dealId },
      });
      const contacts = contactsData?.response?.data || [];

      if (!contacts.length) {
        setAddresses([]);
        setSelectedAddressId("");
        return;
      }

      const addressesArrays = await Promise.all(
        contacts.map((contact: { id: string }) =>
          runServerlessFunction({
            name: "fetchAssociatedCustomObjects",
            parameters: {
              contactId: contact.id,
              customObjectType: "2-44702038",
            },
          }),
        ),
      );

      let allAddresses: CustomObject[] = addressesArrays.flatMap((res) => res?.response?.data || []).filter(Boolean);

      // Include associated address if not in the list
      if (associatedAddress && !allAddresses.find((a) => a.id === associatedAddress.id)) {
        allAddresses = [associatedAddress, ...allAddresses];
      }

      const uniqueAddresses = Array.from(new Map(allAddresses.map((a) => [a.id, a])).values());

      setAddresses(uniqueAddresses);

      if (associatedAddress) {
        setSelectedAddressId(associatedAddress.id);
      } else if (uniqueAddresses.length > 0) {
        setSelectedAddressId(uniqueAddresses[0].id);
      }
    } catch (err) {
      console.error("Error fetching addresses:", err);
      setAddresses([]);
      setSelectedAddressId("");
    } finally {
      setLoading(false);
    }
  }, [dealId, runServerlessFunction, associatedAddress]);

  // Fetch associated shipping address
  useEffect(() => {
    if (!dealId) return;

    const fetchAssociated = async () => {
      try {
        const dealAssociationData: any = await runServerlessFunction({
          name: "fetchDealAssociatedCustomObject",
          parameters: {
            dealId,
            customObjectType: "2-44702038",
          },
        });

        const associated = dealAssociationData?.["response"]?.data || null;
        setAssociatedAddress(associated);
        if (associated) setSelectedAddressId(associated.id);
      } catch (err) {
        console.error("Error fetching associated custom object:", err);
        setAssociatedAddress(null);
      }
    };

    fetchAssociated();
  }, [dealId, runServerlessFunction]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const addressMap = useMemo(() => new Map(addresses.map((a) => [a.id, a])), [addresses]);

  const associateAddressWithDeal = async () => {
    if (!selectedAddressId) return;
    setAssociating(true);

    try {
      await runServerlessFunction({
        name: "associateCustomObjectWithDeal",
        parameters: {
          dealId,
          customObjectType: "2-44702038",
          customObjectId: selectedAddressId,
        },
      });

      await fetchAddresses();
    } catch (err) {
      console.error("Error associating address:", err);
    } finally {
      setAssociating(false);
    }
  };

  return (
    <Flex direction="column" gap="md" wrap="nowrap">
      {loading ? (
        <LoadingSpinner label="Loading addresses..." />
      ) : addresses.length === 0 ? (
        <Text>No shipping addresses found for this deal's contacts.</Text>
      ) : (
        <>
          <Dropdown
            buttonText={
              selectedAddressId && addressMap.has(selectedAddressId) ? getAddressLabel(addressMap.get(selectedAddressId)!) : "Select Shipping Address"
            }
            options={addresses.map((obj) => ({
              label: getAddressLabel(obj),
              value: obj.id,
              onClick: () => setSelectedAddressId(obj.id),
              type: obj.id === selectedAddressId ? "selected" : "default",
            }))}
          />

          <Button onClick={associateAddressWithDeal} disabled={!selectedAddressId || associating}>
            {associating ? "Associating..." : "Add Association to Deal"}
          </Button>

          {associatedAddress && (
            <Text>
              Currently associated address: <Text format={{ fontWeight: "bold" }}>{getAddressLabel(associatedAddress)}</Text>
            </Text>
          )}
        </>
      )}
    </Flex>
  );
};

export default ShippingAddressCard;
