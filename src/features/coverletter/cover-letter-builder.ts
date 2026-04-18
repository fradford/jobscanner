import type { CoverLetterData, StreetAddress } from "./types";
import { file } from "bun";
import { escapeLatex } from "../../util/formatters";
import latex from "node-latex";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

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

  public addSenderDetails(
    name: string,
    company?: string,
    email?: string,
    phone?: string,
    address?: StreetAddress,
  ) {
    this.data.senderInfo = {
      name,
      company,
      email,
      phone,
      address,
    };
  }

  public addRecipientDetails(
    name: string,
    company?: string,
    address?: StreetAddress,
  ) {
    this.data.recipientInfo = {
      name,
      company,
      address,
    };
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

    const senderInfo = this.data.senderInfo;
    buffer += Object.keys(senderInfo)
      .map((key) => {
        const val = Reflect.get(senderInfo, key);
        if (val !== undefined) {
          return escapeLatex(val);
        }
      })
      .join("\\\\")
      .trim();
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

    const recipientInfo = this.data.recipientInfo;
    buffer += Object.keys(recipientInfo)
      .map((key) => {
        const val = Reflect.get(recipientInfo, key);
        if (val !== undefined) {
          return escapeLatex(val);
        }
      })
      .join("\\\\")
      .trim();
    buffer += "}\n\n";
    buffer += `\\opening{Dear ${this.data.recipientInfo.name},}\n\n`;
    return buffer;
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
