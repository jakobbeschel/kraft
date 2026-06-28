// This file creates the connection to our Supabase database.
// We import it into any page that needs to read or write data.

import { createClient } from '@supabase/supabase-js'

// Your Supabase project URL and key — these identify your database
const supabaseUrl = 'https://gonwtznuiktiwlzhleec.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvbnd0em51aWt0aXdsemhsZWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDM0MzgsImV4cCI6MjA5Nzk3OTQzOH0.WxN08ZxtGMvWBYzcCT5ZE6jkL7_Qq4PpP51raZMlJpY'

// Create and export the Supabase client so other files can import it
export const supabase = createClient(supabaseUrl, supabaseKey)