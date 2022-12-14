# Access Patterns

This document defines the common access patterns iBuddy requires. The access
patterns are used to define an optimized DynamoDB structure.

- Get a **User** hashed **Password**
- Get all **Users** by a **Role**:
  - Get all **Buddies**
    - Get all **Buddies** when **ContractEndDate** hasn't come.
  - Get all **Admins**
  - Get all etc.
- Get all **Mentees**
- Get all **Mentees** in **Current Semester**
- Get all **Mentees** for a **Buddy** on **AgreementEndDate**
- Get all **Notes** for a **Mentee**.
- Get all **FAQs**.
- Get all **Assets** a **User** has access to
- Get all **Assets** a **User** owns
