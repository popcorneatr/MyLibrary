const express = require('express');
const router = express.Router();
const Book = require('../models/book')
const Author = require('../models/author');
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif']

//All Book route
router.get('/', async (req, res) => {
    let query = Book.find()
    //Query Title
    if (req.query.title != null && req.query.title != '') {
        query = query.regex('title', new RegExp(req.query.title, 'i'))
    }
    //Query publish before date
    if (req.query.publishedBefore != null && req.query.publishedBefore != '') {
        query = query.lte('publishDate', req.query.publishedBefore)
    }

    //Query publish after date
    if (req.query.publishedAfter != null && req.query.publishedAfter != '') {
        query = query.gte('publishDate', req.query.publishedAfter)
    }
    try {
        const books = await query.exec()
        res.render('books/index', {
            books: books,
            searchOptions: req.query
        })
    } catch (error) {
        res.redirect('/')
    }
});

//New Book route
router.get('/new', async (req, res) => {
    renderNewPage(res, new Book())
})

//Create Book route
router.post('/', async (req, res) => {
    const book = new Book({
        title: req.body.title,
        author: req.body.author,
        publishDate: new Date(req.body.publishDate),
        pageCount: req.body.pageCount,
        description: req.body.description
    })
    saveCover(book, req.body.cover)

    try {
        const newBook = await book.save()
        res.redirect(`books/${newBook.id}`)
    } catch (err) {
        // console.error(err)
        renderNewPage(res, book, true)
    }
})

//Show Book Route
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
                                .populate('author')
                                .exec()
        res.render('books/show', { book: book })
    } catch {
        res.redirect('/')
    }
})

//Edit Book Route
router.get('/:id/edit', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
        renderEditPage(res, book)
    } catch {
        res.redirect('/')
    }
    
})

//Update Book route
router.put('/:id', async (req, res) => {
    let book

    try {
        book = await Book.findById(req.params.id)
        book.title = req.body.title
        book.author = req.body.author
        book.publishDate = new Date(req.body.publishDate)
        book.pageCount = req.body.pageCount
        book.description = req.body.description
        if (req.body.cover != null && req.body.cover != '') {
            saveCover(book, req.body.cover)
        }
        await book.save()
        res.redirect(`/books/${book.id}`)
    } catch {  
        if (book != null) {
           renderEditPage(res, book, true) 
        } else{
            res.redirect('/')
        }
    }
})

//Delete Book Page
router.delete('/:id', async (req, res) => {
    let book
    try {
        book = await Book.findById(req.params.id)
        await book.deleteOne()
        res.redirect('/books')
    } catch (error){
        console.log(error)
        if (book != null) {
           res.render('books/show', {
            book: book,
            errorMessage: "Could not remove book"
           }) 
        } else {
            res.redirect('/')
        }
    }
})

async function renderNewPage(res, book, hasError = false) {
    renderFormPage(res, book, 'new', hasError)
}

async function renderEditPage(res, book, hasError = false) {
    renderFormPage(res, book, 'edit', hasError)
}

async function renderFormPage(res, book, form, hasError = false) {
    try {
        const authors = await Author.find({})
        const params = {
            authors: authors,
            book: book
        }
        if (hasError) {
            if (form === 'edit') {
                params.errorMessage = 'Error Updating Book'
            } else {
                params.errorMessage = 'Error Creating Book'
            }
        }
        res.render(`books/${form}`, params)
    } catch  {
        res.redirect('/books')
    }
}

function saveCover(book, coverEncoded) {
    // No cover provided
    if (coverEncoded == null) return; 

    let cover;
    try {
        cover = JSON.parse(coverEncoded); 
    } catch (err) {
        // console.error('Invalid cover data:', err);
        return;
    }

    if (cover != null && imageMimeTypes.includes(cover.type)) {
        try {
            // Save the image as a Buffer
            book.coverImage = new Buffer.from(cover.data, 'base64'); 
            // Save the MIME type
            book.coverImageType = cover.type; 
        } catch (err) {
            // console.error('Error processing cover image:', err);
        }
    }
}

module.exports = router;