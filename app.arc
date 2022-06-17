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
user
  pk *String

password
  pk *String # userId

mentee
  pk *String # buddyId -> userId
  sk **String # menteeId
