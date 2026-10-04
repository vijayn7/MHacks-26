import React from 'react';
import { Redirect } from 'expo-router';

// Preserve old bookmarks after removal of the sample storefront.
export default function RetiredPurchaseDemo() {
  return <Redirect href="/profile" />;
}
