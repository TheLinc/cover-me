const JSZip = require('<repo>/extension/node_modules/jszip')
const fs = require('fs')
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
const p = (t, style = 'ListBullet') => `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Garamond"/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`
const h = (t) => p(t, 'Heading1')
const n = (t) => p(t, 'Normal')
const body = [
  p('Test Person', 'Title'), n('test@example.com | 555-0100'),
  h('Experience'),
  n('Software Engineer, Initech, Austin, TX, Jan 2022 – Present'), p('Built billing export pipeline'), p('Maintained customer dashboard'),
  n('Junior Developer, Globex, Remote, Jun 2020 – Dec 2021'), p('Fixed bugs in the web app'),
  h('Education'), n('BS Computer Science, State University, Austin, TX, 2016 – 2020'),
  h('Skills'), n('TypeScript, Postgres, React'),
  h('Volunteer Work'), n('Mentor, Code Club (2019 – 2021)'),
].join('')
const zip = new JSZip()
zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr/></w:body></w:document>`)
zip.generateAsync({ type: 'nodebuffer' }).then((b) => { fs.writeFileSync('Test Person Resume.docx', b); console.log('wrote', b.length) })
