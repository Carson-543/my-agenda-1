import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { calendarId } = await req.json()
    
    if (!calendarId) {
      return new Response(
        JSON.stringify({ error: 'Calendar ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const apiKey = Deno.env.get('GOOGLE_CALENDAR_API_KEY')
    if (!apiKey) {
      console.error('Google Calendar API key not found')
      return new Response(
        JSON.stringify({ error: 'Google Calendar API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get current time and 6 months from now for event range
    const now = new Date()
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

    const timeMin = now.toISOString()
    const timeMax = sixMonthsFromNow.toISOString()

    // Fetch events from Google Calendar API
    const googleCalendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`
    
    console.log('Fetching from Google Calendar API:', calendarId)
    
    const response = await fetch(googleCalendarUrl)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Calendar API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `Google Calendar API error: ${response.status} - ${errorText}` 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    
    if (!data.items) {
      console.log('No events found in calendar')
      return new Response(
        JSON.stringify({ events: [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Transform Google Calendar events to our format
    const events = data.items.map((event: GoogleCalendarEvent) => {
      // Handle both date and dateTime formats
      const startDate = event.start.dateTime || event.start.date
      const endDate = event.end.dateTime || event.end.date
      
      return {
        id: event.id,
        title: event.summary || 'Untitled Event',
        start: new Date(startDate),
        end: new Date(endDate),
        description: event.description || undefined,
        location: event.location || undefined,
      }
    })

    console.log(`Successfully fetched ${events.length} events from Google Calendar`)

    return new Response(
      JSON.stringify({ events }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in google-calendar function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})