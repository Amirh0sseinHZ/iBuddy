@app
iBuddy

@aws
region eu-central-1

@http
/*
  method any
  src server

@static

@tables
users
  id *String

passwords
  userId *String

mentees
  pk *String
  sk **String

@tables-indexes
mentees
  buddyId *string
  name menteesByBuddyId