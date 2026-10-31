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

Students create an account when they select **Borrow** on an available book. After registration, the borrowing confirmation opens automatically. Existing students can log in first.

**Demo student** (only if you used `--demo-student`): `demo.student@unilib.test` / `Student@123`. Delete this account before any real use.

## 3. Publish the full website (Render + MongoDB Atlas)

GitHub Pages can display static files but cannot run this app's Node.js API. Use Render for the web server and MongoDB Atlas for the shared database. The root `render.yaml` configures a free Render web service and generates a private JWT secret.

1. Create a free MongoDB Atlas cluster and database user. Give the user read/write access to the app database. In **Network Access**, allow connections from Render; if you use `0.0.0.0/0`, protect the database with a strong, unique password and database-scoped permissions.
2. In Atlas, choose **Connect → Drivers** and copy the connection string for a database named `unilib`. Replace the username and password placeholders; URL-encode any special characters in the password.
3. Sign in to Render, choose **New → Blueprint**, and connect `kishoremain6-tech/unilib-library-management`. Select the repository's `render.yaml` blueprint. When prompted, paste the Atlas URI into the `MONGODB_URI` environment variable. Render generates `JWT_SECRET`; do not commit either value.
4. Wait for the first deployment to finish, then open the public `onrender.com` URL shown for the service. It serves the website and API together.
5. Seed the shared database and create a librarian account from your computer: in a terminal opened in `backend`, configure `MONGODB_URI` to the same Atlas URI in a local, ignored `.env` file, then run `npm run seed` and `npm run create-admin`. Keep the `.env` file private.

The free web service may sleep when idle and take a short time to wake up. Replace demo records and review privacy, backups, and hosting limits before using the system with real students.

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
