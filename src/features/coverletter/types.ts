export interface StreetAddress {
  addressLine1?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
}

export interface LetterSenderData {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: StreetAddress;
}

export interface LetterRecipientData {
  name?: string;
  company?: string;
  address?: StreetAddress;
}

export interface CoverLetterData {
  senderInfo?: LetterSenderData;
  recipientInfo?: LetterRecipientData;
  bodyParagraphs?: string[];
}
