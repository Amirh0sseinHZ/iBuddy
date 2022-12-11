@app
iBuddy

@aws
region eu-central-1
timeout 15

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

assets
  id *String

@tables-indexes
mentees
  buddyId *string
  name menteesByBuddyId

assets
  ownerId *string
  name assetsByOwnerId