import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { Readable } from "stream";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const { studentName, image, history } = await req.json();

    if (!studentName || !image || !history) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Get user's Google Account to access Google Drive & Docs API
    let accessToken = (session as any).accessToken;
    let refreshToken = (session as any).refreshToken;

    if (!accessToken) {
      const account = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          provider: "google",
        },
      });
      if (account) {
        accessToken = account.access_token;
        refreshToken = account.refresh_token;
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Google 帳號未連結或沒有授權" }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const docs = google.docs({ version: 'v1', auth: oauth2Client });

    const dateStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '');
    const title = `${dateStr}_${studentName}_畫作故事紀錄`;

    // 2. Upload Image to Google Drive
    const base64Data = image.split(",")[1];
    const mimeType = image.split(";")[0].split(":")[1] || "image/jpeg";
    const imageBuffer = Buffer.from(base64Data, "base64");
    
    const stream = new Readable();
    stream.push(imageBuffer);
    stream.push(null);

    const driveFile = await drive.files.create({
      requestBody: {
        name: `${title}_image.jpg`,
        mimeType: mimeType,
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, webContentLink',
    });

    const imageFileId = driveFile.data.id;
    if (!imageFileId) throw new Error("Failed to upload image to Drive");

    // Make the image temporarily public so Docs API can fetch and embed it
    let publicPermissionId = null;
    try {
      const perm = await drive.permissions.create({
        fileId: imageFileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      publicPermissionId = perm.data.id;
    } catch (e) {
      console.error("Warning: Could not make image public", e);
    }

    const imageUrl = `https://drive.google.com/uc?id=${imageFileId}`;

    // 3. Create Google Doc
    const doc = await docs.documents.create({
      requestBody: {
        title: title,
      },
    });

    const documentId = doc.data.documentId;
    if (!documentId) throw new Error("Failed to create Google Doc");

    // 4. Format Content for Docs
    const requests: any[] = [];
    let currentIndex = 1;

    // Insert Title Text
    const titleText = `${title}\n\n`;
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: titleText,
      }
    });
    
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: currentIndex, endIndex: currentIndex + titleText.length },
        paragraphStyle: {
          namedStyleType: 'HEADING_1',
          alignment: 'CENTER'
        },
        fields: 'namedStyleType, alignment'
      }
    });
    currentIndex += titleText.length;

    // Insert Image
    requests.push({
      insertInlineImage: {
        location: { index: currentIndex },
        uri: imageUrl,
        objectSize: {
          width: { magnitude: 400, unit: 'PT' }
        }
      }
    });
    
    const newlineAfterImage = '\n\n';
    requests.push({
      insertText: {
        location: { index: currentIndex + 1 }, // +1 for the image element
        text: newlineAfterImage,
      }
    });
    currentIndex += 1 + newlineAfterImage.length;

    // Insert Dialogue History
    for (const msg of history) {
      const roleText = msg.role === 'ai' ? '老師：' : `${studentName}：`;
      const dialogText = `${roleText}${msg.text}\n\n`;
      
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: dialogText,
        }
      });

      // Bold the speaker name
      requests.push({
        updateTextStyle: {
          range: { startIndex: currentIndex, endIndex: currentIndex + roleText.length },
          textStyle: { bold: true },
          fields: 'bold'
        }
      });
      
      currentIndex += dialogText.length;
    }

    // Apply batch update to document
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: { requests },
    });

    // 5. Remove the public permission from the image now that it's embedded
    if (publicPermissionId) {
      try {
        await drive.permissions.delete({
          fileId: imageFileId,
          permissionId: publicPermissionId,
        });
      } catch (e) {
        console.error("Warning: Could not remove public permission", e);
      }
    }

    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    // 6. Save record to Database
    await prisma.conversation.create({
      data: {
        userId: session.user.id,
        studentName: studentName,
        documentId: documentId,
        documentUrl: documentUrl,
      }
    });

    return NextResponse.json({ success: true, documentUrl });
  } catch (error: any) {
    console.error("Save Story Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save story" }, { status: 500 });
  }
}
