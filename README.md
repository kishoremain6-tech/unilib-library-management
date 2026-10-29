# UniLib – Smart University Library Management System

A full-stack Web Technology project: **HTML5 + CSS3 + vanilla JavaScript** frontend, **Node.js + Express** REST API, **MongoDB + Mongoose** database. The Express server also serves the frontend, so you run **one command** and open one URL.

> All 500 seeded books are **sample demo records** (flagged `isDemo`, ISBNs start with `DEMO-`). They are not verified publications.

## 1. Requirements
- Node.js 18 or newer (https://nodejs.org)
- MongoDB: either **MongoDB Community running locally**, or a free **MongoDB Atlas** cluster
- VS Code

## 2. Run it in VS Code
1. Unzip the project, then in VS Code choose **File → Open Folder** and pick `unilib-library-management`.
2. Open the terminal (**Terminal → New Terminal**) and run:

```bash
cd backend
npm install
```

3. Create your environment file. Copy `backend/.env.example` to `backend/.env`:

```bash
# macOS / Linux / Git Bash
cp .env.example .env
# Windows PowerShell
copy .env.example .env
```

4. Open `backend/.env` and set:
   - `MONGODB_URI` – local default `mongodb://127.0.0.1:27017/unilib` works if MongoDB is running on your PC. For Atlas, paste your Atlas connection string (replace `<user>` and `<password>`; in Atlas, add your IP under *Network Access*).
   - `JWT_SECRET` – any long random text. Generate one with:
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

5. Load the 500 demo books (and optionally a demo student):

```bash
npm run seed -- --demo-student
```

6. Create your librarian (admin) account. The command asks for name, email and a hidden password (10+ characters):

```bash
npm run create-admin
```

7. Start the server and open **http://localhost:5000**

```bash
npm start
```

(`npm run dev` restarts automatically when you edit files.)

**Demo student** (only if you used `--demo-student`): `demo.student@unilib.test` / `Student@123`. Delete this account before any real use.

## 3. Publish a public website (Railway + MongoDB Atlas)

The included `Dockerfile` packages the frontend and API together for Railway or another Docker host. A MongoDB Atlas database is still required; do not put database credentials in source code.

1. Push this project to a GitHub repository. Keep it private unless you intend to publish the source code.
2. Create a MongoDB Atlas cluster and database user. In Atlas Network Access, add your computer's IP so you can initialize the database. Allow the host's outbound IPs to connect; if they are not fixed, allow `0.0.0.0/0` and protect access with a strong database password and a database user limited to this app's database.
3. In Atlas, copy the Node.js connection string for the `unilib` database. Replace the username and password placeholders; URL-encode special characters in the password.
4. Before deployment, copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI` to the Atlas connection string. From `backend`, run `npm install`, `npm run seed`, and `npm run create-admin`. This initializes sample books and a librarian without creating a shared demo-student account. Students can register through the public website.
5. In Railway, create a project from the GitHub repository. Railway detects the root `Dockerfile` and builds the app. Add `MONGODB_URI` and `JWT_SECRET` as service variables; generate a long random `JWT_SECRET` and keep both values private. Set `NODE_ENV=production`. Railway provides `PORT` automatically.
6. In the Railway service settings, generate a public domain, then open that URL. The same URL serves the website and its API.

Keep `.env` and all database credentials private. Before using this with real students, replace demo records and review the deployment's privacy, backups, and hosting costs.

## 4. Pages
| Page | URL |
|---|---|
| Home | `/` |
| Student register / login | `/register.html`, `/login.html` |
| Catalogue, Book details | `/books.html`, `/book-details.html?id=…` |
| Borrow form | opens as a window from any **Borrow** button |
| Student dashboard, My books, History, Fines | `/student-dashboard.html`, `/my-books.html`, `/history.html`, `/fines.html` |
| Smart Shelf & Book Finder | `/shelf-finder.html` |
| Librarian login | `/admin/login.html` |
| Admin (Overview, Books, Students, Borrow & return, Fines, Reports, Settings) | `/admin/dashboard.html#overview` … `#settings` |

## 5. Rules (enforced on the server)
- Loan period: 3 calendar days. Due date = borrow date + 3 days.
- Fine: ₹10 per overdue calendar day, starting the day **after** the due date. None if returned on or before the due date.
- Fine is calculated by the server on every dashboard load and fixed at return. Status: Unpaid / Paid / Waived (waiver needs a reason).
- Max 5 active books; a student with an overdue book cannot borrow more; one active copy per book per student.
- Change the numbers in `.env` (`LOAN_DAYS`, `FINE_PER_DAY`, `MAX_ACTIVE_BORROWS`).

## 6. How consistency is protected
Borrowing uses an atomic `findOneAndUpdate({availableCopies: {$gt: 0}}, {$inc: -1})`, so two students cannot take the last copy. If saving the transaction then fails, the copy is added back. A partial unique index stops duplicate active loans. Returns flip the status atomically first, so a double click cannot return twice. (This works on a standalone local MongoDB, which has no multi-document transactions.)

## 7. Security
bcrypt password hashing (`bcryptjs`, cost 12) · JWT in an `httpOnly`, `sameSite=strict` cookie · role checks on the server · public registration can only create students · helmet + CSP · NoSQL-injection sanitising · rate limits (10 login attempts / 15 min) · CSV export guards against spreadsheet-formula injection · secrets only in `.env`.

## 8. Test checklist
Run `npm run test:logic` (no database needed) to check due-date and fine maths, then go through this list in the browser:

- [ ] Register a student (try a duplicate email / student ID: rejected)
- [ ] Log in, search the catalogue live, filter by category, tick "available only"
- [ ] Borrow a book: confirmation shows transaction ID, borrow date, due date (+3 days); available copies drop by 1
- [ ] Borrow the same book again: rejected. Borrow a book with 0 copies: button disabled
- [ ] My Books shows the loan; Return it: copies go back up by 1; History lists it
- [ ] Log in as librarian: Overview numbers match; add, edit, delete a book (delete is blocked while it is on loan)
- [ ] Students: search by name or ID, view their loans
- [ ] Late fine: to test without waiting, in `mongosh` run
  `db.borrowtransactions.updateOne({status:"borrowed"},{$set:{dueDate:new Date(Date.now()-5*86400000)}})`
  then reload the student's dashboard: it shows 5 days overdue and ₹50. Return it, then see an Unpaid fine of ₹50 in Admin → Fines
- [ ] Admin → Fines: Mark paid; waive another with a reason. Student's Fines page updates
- [ ] Admin → Reports: filter, then Export CSV
- [ ] Shelf Finder: search, tap a rack, "Find available books", Popular (after some borrows), Suggested for you (after choosing interests)
- [ ] Student cannot open `/admin/dashboard.html` (redirected) and API calls to admin routes return 403

## 9. Project structure
```
unilib-library-management/
├─ frontend/   index.html, login/register, books, book-details, student pages, shelf-finder, admin/, css/, js/, assets/
├─ backend/    server.js, config/, models/, routes/, controllers/, middleware/, services/, scripts/, utils/, .env.example
└─ README.md
```
Book covers without an image link get an automatically generated cover. Librarians can paste an `https://` image link or put a file in `frontend/assets/` and use `/assets/yourfile.jpg`. (There is no file-upload button.)
