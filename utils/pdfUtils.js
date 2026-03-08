const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION
});

// Render EJS template to HTML
async function renderTemplate(templateName, data) {
  const templatePath = path.join(
    __dirname,
    "../views",
    `${templateName}.ejs`
  );
  const html = await ejs.renderFile(templatePath, data);
  return html;
}

// Convert HTML to PDF using Puppeteer
async function htmlToPDF(html) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle0"
  });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true
  });

  await browser.close();
  return pdfBuffer;
}

// Upload PDF to S3
async function uploadPDFToS3(buffer, key) {

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: "application/pdf"
  });

  await s3.send(command);

  return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// Full pipeline: Template → PDF → S3
async function generateAndUploadPDF(templateName, data, fileKey) {
  const html = await renderTemplate(templateName, data);
  const pdfBuffer = await htmlToPDF(html);
  const s3Url = await uploadPDFToS3(pdfBuffer, fileKey);
  return {
    pdfBuffer,
    s3Url
  };
}

module.exports = {
  renderTemplate,
  htmlToPDF,
  uploadPDFToS3,
  generateAndUploadPDF
};