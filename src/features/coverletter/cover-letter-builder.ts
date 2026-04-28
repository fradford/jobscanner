import type {
  CoverLetterData,
  LetterRecipientData,
  LetterSenderData,
  StreetAddress,
} from "./types";
import { file } from "bun";
import { escapeLatex } from "../../lib/formatters";
import latex from "node-latex";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { send } from "node:process";
import { format } from "node:path/win32";
import { isExportSpecifier } from "typescript";

export class CoverLetterBuilder {
  private data: CoverLetterData;

  private outputpath: string;
  private templatepath: string;
  private signaturepath?: string;

  public constructor(
    output: string,
    template: string = "templates/cover-letter.tex",
    signature?: string,
  ) {
    this.data = {};

    this.outputpath = output;
    this.templatepath = template;
    this.signaturepath = signature;
  }

  public addSenderDetails(details: LetterSenderData) {
    this.data.senderInfo = details;
  }

  public addRecipientDetails(details: LetterRecipientData) {
    this.data.recipientInfo = details;
  }

  public addBodyParagraphs(bodyParagraphs: string[]) {
    this.data.bodyParagraphs = bodyParagraphs;
  }

  public async buildLetter() {
    const template = file(this.templatepath);
    let buffer = await template.text();

    buffer = this.buildSenderAddress(buffer);
    buffer = this.buildRecipientAddress(buffer);
    buffer = this.buildLetterBody(buffer);
    buffer = this.buildSignature(buffer);

    const pdf = latex(buffer);
    const output = createWriteStream(this.outputpath);
    await pipeline(pdf, output);
  }

  private buildSenderAddress(buffer: string) {
    if (this.data.senderInfo === undefined)
      throw new Error("Cannot build cover letter without sender information!");

    buffer += "\\address{";

    const info = this.data.senderInfo;

    const addressParts = [];

    if (info.name) addressParts.push(escapeLatex(info.name));
    if (info.company) addressParts.push(escapeLatex(info.company));
    if (info.email) addressParts.push(escapeLatex(info.email));
    if (info.phone) addressParts.push(escapeLatex(info.phone));
    if (info.address) {
      this.buildStreetAddress(info.address).forEach((line) =>
        addressParts.push(escapeLatex(line)),
      );
    }

    buffer += addressParts.join("\\\\").trim();
    buffer += "}\n\n";
    return buffer;
  }

  private buildRecipientAddress(buffer: string) {
    if (this.data.recipientInfo === undefined)
      throw new Error(
        "Cannot build cover letter without recipient information!",
      );

    buffer += "\\begin{document}\n";
    buffer += "\\begin{letter}{";

    const info = this.data.recipientInfo;
    const addressParts = [];

    if (info.name) addressParts.push(escapeLatex(info.name));
    if (info.company) addressParts.push(escapeLatex(info.company));
    if (info.address) {
      this.buildStreetAddress(info.address).forEach((line) =>
        addressParts.push(escapeLatex(line)),
      );
    }

    buffer += addressParts.join("\\\\").trim();
    buffer += "}\n\n";
    buffer += `\\opening{Dear ${this.data.recipientInfo.name},}\n\n`;
    return buffer;
  }

  private buildStreetAddress(address: StreetAddress): string[] {
    // returns one or two lines in an array e.g.
    // 123 Example Street
    // Toronto, ON, Canada, A1A 1A1

    const formatted = [];

    if (address.addressLine1) formatted.push(address.addressLine1);

    const addressLine2 = [];
    if (address.city) addressLine2.push(address.city);
    if (address.province) addressLine2.push(address.province);
    if (address.country) addressLine2.push(address.country);
    if (address.postalCode) addressLine2.push(address.postalCode);

    formatted.push(addressLine2.join(", "));

    return formatted;
  }

  private buildLetterBody(buffer: string) {
    if (this.data.bodyParagraphs === undefined)
      throw new Error("Cannot build cover letter without body!");

    for (const para of this.data.bodyParagraphs) {
      buffer += `${escapeLatex(para)}\n\n`;
    }

    return buffer;
  }

  private buildSignature(buffer: string) {
    if (this.data.senderInfo === undefined)
      throw new Error("Cannot build cover letter without sender information!");

    buffer += `\\closing{Sincerely, \\\\ `;

    if (this.signaturepath !== undefined) {
      buffer += `\\fromsig{\\includegraphics[width=2in]{${this.signaturepath}}} \\\\ `;
    }

    buffer += `\\fromname{${this.data.senderInfo.name}}}\n`;
    buffer += "\\end{letter}\n";
    buffer += "\\end{document}\n";

    return buffer;
  }
}
