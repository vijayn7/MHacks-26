import { Contact, ContactField, getPermissionsAsync, requestPermissionsAsync } from 'expo-contacts';
import { readSystemContacts } from './contacts-access';
const fields = [ContactField.FULL_NAME, ContactField.EMAILS, ContactField.PHONES] as const;
export function loadContacts(signal?: AbortSignal) {
  return readSystemContacts(
    {
      getPermission: getPermissionsAsync,
      requestPermission: requestPermissionsAsync,
      getPage: (offset, limit) => Contact.getAllDetails(fields, { limit, offset }),
    },
    signal,
  );
}
