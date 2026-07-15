const Meeting = require('../Models/Meeting');
const { google } = require('googleapis');

const getOAuthClient = (user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken
  });
  return oauth2Client;
};

exports.getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ owner: req.user.id }).populate('client', 'name email company');
    res.status(200).json({ success: true, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createMeeting = async (req, res) => {
  try {
    // Default fallback mock Google Meet link
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const randPart = (len) => Array.from({length: len}, () => letters[Math.floor(Math.random() * 26)]).join('');
    let meetLink = `https://meet.google.com/${randPart(3)}-${randPart(4)}-${randPart(3)}`;
    let googleCalendarEventId = undefined;

    // Check if user has Google credentials connected
    if (req.user && req.user.googleAccessToken && req.user.googleRefreshToken) {
      try {
        const oauth2Client = getOAuthClient(req.user);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        const event = {
          summary: req.body.title,
          description: req.body.description || 'Clientsy Meeting',
          start: {
            dateTime: new Date(req.body.startAt).toISOString(),
            timeZone: 'UTC'
          },
          end: {
            dateTime: new Date(req.body.endAt).toISOString(),
            timeZone: 'UTC'
          },
          conferenceData: {
            createRequest: {
              requestId: 'meet-' + Date.now().toString(),
              conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
          }
        };

        const response = await calendar.events.insert({
          calendarId: 'primary',
          resource: event,
          conferenceDataVersion: 1
        });

        googleCalendarEventId = response.data.id;
        if (response.data.hangoutLink) {
          meetLink = response.data.hangoutLink;
        }
      } catch (gErr) {
        console.error('Google Calendar event creation failed, falling back to mock link:', gErr);
      }
    }

    const meeting = await Meeting.create({
      ...req.body,
      meetLink,
      googleCalendarEventId,
      owner: req.user.id
    });
    res.status(201).json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

exports.deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, owner: req.user.id });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Check if synced to Google Calendar and delete it there first
    if (meeting.googleCalendarEventId && req.user && req.user.googleAccessToken && req.user.googleRefreshToken) {
      try {
        const oauth2Client = getOAuthClient(req.user);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: meeting.googleCalendarEventId
        });
      } catch (gErr) {
        console.error('Failed to delete Google Calendar event:', gErr);
      }
    }

    await Meeting.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
