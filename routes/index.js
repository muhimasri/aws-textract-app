const express = require('express')
const router = express.Router()
const formidable = require('formidable')
const AWS = require('aws-sdk')
const fs = require('fs')
require('dotenv').config()

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Textract Uploader' })
})

router.post('/fileupload', (req, res, next) => {
  // Upload logic
  res.render('fileupload', { title: 'Upload Results', form: {} })
  const form = new formidable.IncomingForm()
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err)
    }
    const fileContent = fs.readFileSync(files.filetoupload.path)
    const s3Params = {
      Bucket: process.env.AWS_BUCKET,
      Key: `${Date.now().toString()}-${files.filetoupload.name}`,
      Body: fileContent,
      ContentType: files.filetoupload.type,
      ACL: 'public-read'
    }
    const s3Content = await s3Upload(s3Params)
    const data = await documentExtract(s3Content.Key)
  })
})

async function s3Upload (params) {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  })
  return new Promise(resolve => {
    s3.upload(params, (err, data) => {
      if (err) {
        console.error(err)
        resolve(err)
      } else {
        resolve(data)
      }
    })
  })
}

async function documentExtract (key) {
  return new Promise(resolve => {
    var textract = new AWS.Textract({
      region: process.env.AWS_REGION,
      endpoint: `https://textract.${process.env.AWS_REGION}.amazonaws.com/`,
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY
    })
    var params = {
      Document: {
        S3Object: {
          Bucket: process.env.AWS_BUCKET,
          Name: key
        }
      },
      FeatureTypes: ['FORMS']
    }

    textract.analyzeDocument(params, (err, data) => {
      if (err) {
        return resolve(err)
      } else {
        resolve(data)
      }
    })
  })
}

module.exports = router
