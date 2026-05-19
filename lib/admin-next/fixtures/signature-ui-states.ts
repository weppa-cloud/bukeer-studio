import {
  signatureUiVariantDefaults,
  type SignatureUiVariant,
  type SignatureUiVariantState,
} from '@/components/admin-next/signature-ui';

export const signatureUiStateOrder: SignatureUiVariantState[] = [
  'loading',
  'empty',
  'error',
  'no_permission',
  'approved',
  'rejected',
  'executing',
  'executed',
];

export const signatureUiStateFixtures: SignatureUiVariant[] = signatureUiStateOrder.map(
  (state) => signatureUiVariantDefaults[state]
);

