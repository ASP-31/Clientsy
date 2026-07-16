const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const Document = require('./Models/Document');
const { cloudinary } = require('./config/cloudinary');

async function migrate() {
  try {
    // 1. Connect to Database
    await connectDB();
    
    // 2. Fetch all documents in the collection
    const documents = await Document.find({});
    console.log(`Found ${documents.length} total documents in the database.`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const doc of documents) {
      if (doc.fileUrl && doc.fileUrl.startsWith('data:')) {
        console.log(`Migrating document "${doc.name}" (${doc._id}) of type ${doc.fileType}...`);
        
        const category = doc.category || 'other';
        let folderSuffix = 'others';
        if (['invoice', 'receipt', 'contract', 'proposal'].includes(category)) {
          folderSuffix = `${category}s`;
        } else {
          folderSuffix = `${category}s`;
        }
        
        try {
          // Upload base64 string directly to Cloudinary
          const uploadResult = await cloudinary.uploader.upload(doc.fileUrl, {
            folder: `Clientsy/${folderSuffix}`,
            resource_type: 'auto'
          });
          
          // Update MongoDB fields
          doc.fileUrl = uploadResult.secure_url;
          doc.publicId = uploadResult.public_id;
          await doc.save();
          
          console.log(`Successfully migrated "${doc.name}" -> ${uploadResult.secure_url}`);
          migratedCount++;
        } catch (uploadError) {
          console.error(`Error uploading/saving document "${doc.name}" (${doc._id}):`, uploadError.message);
          errorCount++;
        }
      } else {
        console.log(`Skipping document "${doc.name}" (${doc._id}) - already remote URL.`);
        skippedCount++;
      }
    }
    
    console.log(`\nMigration Summary:`);
    console.log(`- Successfully Migrated: ${migratedCount}`);
    console.log(`- Skipped (Already remote): ${skippedCount}`);
    console.log(`- Errors: ${errorCount}`);
  } catch (error) {
    console.error('Migration script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  }
}

migrate();
