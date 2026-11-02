import "server-only";
import { getPublicBusinessContact } from "./public-business-contact";

type PublicationInput = {
  operatorName?: string;
  operatorAddress?: string;
  privacyEmail?: string;
  grievanceName?: string;
  grievanceDesignation?: string;
  grievanceEmail?: string;
};

const text = (value?: string) => value?.trim().slice(0, 500) || undefined;

/** Public disclosures only. Configuration does not confer legal approval. */
export function getLegalPublication(
  input: PublicationInput = {
    operatorName: process.env.LEGAL_OPERATOR_NAME,
    operatorAddress: process.env.LEGAL_OPERATOR_ADDRESS,
    privacyEmail: process.env.LEGAL_PRIVACY_EMAIL,
    grievanceName: process.env.LEGAL_GRIEVANCE_NAME,
    grievanceDesignation: process.env.LEGAL_GRIEVANCE_DESIGNATION,
    grievanceEmail: process.env.LEGAL_GRIEVANCE_EMAIL,
  },
) {
  return {
    operatorName: text(input.operatorName),
    operatorAddress: text(input.operatorAddress),
    privacyEmail: getPublicBusinessContact({ email: input.privacyEmail }).email,
    grievanceName: text(input.grievanceName),
    grievanceDesignation: text(input.grievanceDesignation),
    grievanceEmail: getPublicBusinessContact({ email: input.grievanceEmail })
      .email,
  };
}
