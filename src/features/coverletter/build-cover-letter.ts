import { file, YAML } from "bun";
import type {
  StreetAddress,
  LetterSenderData,
  LetterRecipientData,
  CoverLetterData,
  CoverLetterBuilderOptions,
} from "./types";
import {
  asOptionalString,
  asOptionalStringArray,
  asString,
  isRecord,
} from "../../util/type-utils";
import { CoverLetterBuilder } from "./cover-letter-builder";

// these functions are basically just for debugging
// the normal flow will automatically build cover letters
// in memory for each matched job post
export async function loadCoverLetter(path: string): Promise<CoverLetterData> {
  const fileContent = await file(path).text();
  return parseCoverLetterContent(fileContent);
}

export function parseCoverLetterContent(content: string): CoverLetterData {
  const parsed = YAML.parse(content);

  if (!isRecord(parsed))
    throw new Error("Invalid letter: root value must be an object.");

  return {
    senderInfo: parseSenderInfo(parsed.senderInfo),
    recipientInfo: parseRecipientInfo(parsed.recipientInfo),
    bodyParagraphs: asOptionalStringArray(parsed.bodyParagraphs),
  };
}

// creates a CoverLetterBuilder and builds the cover letter using provided data
export async function buildCoverLetter(
  letterData: CoverLetterData,
  options: CoverLetterBuilderOptions,
): Promise<void> {
  const builder = new CoverLetterBuilder(
    options.outputPath,
    options.templatePath,
    options.signaturePath,
  );

  if (letterData.senderInfo) builder.addSenderDetails(letterData.senderInfo);
  if (letterData.recipientInfo)
    builder.addRecipientDetails(letterData.recipientInfo);
  if (letterData.bodyParagraphs)
    builder.addBodyParagraphs(letterData.bodyParagraphs);

  await builder.buildLetter();
}

function parseSenderInfo(value: unknown): LetterSenderData | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value))
    throw new Error("Invalid letter: senderInfo must be an object.");

  return {
    name: asOptionalString(value.name),
    company: asOptionalString(value.company),
    email: asOptionalString(value.email),
    phone: asOptionalString(value.phone),
    address: parseStreetAddress(value.address),
  };
}

function parseRecipientInfo(value: unknown): LetterRecipientData | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value))
    throw new Error("Invalid letter: recipientInfo must be an object.");

  return {
    name: asOptionalString(value.name),
    company: asOptionalString(value.company),
    address: parseStreetAddress(value.address),
  };
}

function parseStreetAddress(value: unknown): StreetAddress | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value))
    throw new Error("Invalid letter: all addresses must be objects.");

  return {
    addressLine1: asOptionalString(value.addressLine1),
    city: asOptionalString(value.city),
    province: asOptionalString(value.province),
    country: asOptionalString(value.country),
    postalCode: asOptionalString(value.postalCode),
  };
}
