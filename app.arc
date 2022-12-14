@app
iBuddy

@aws
region eu-central-1
timeout 15

@plugins
architect/plugin-storage-private

@http
/*
  method any
  src server

@static

@storage-private
useruploads

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

mentees
  email *string
  name menteeByEmail

assets
  ownerId *string
  name assetsByOwnerId

assets
  searchableName *string
  name assetBySearchableName