const CategoryModel = require('../../models/CategoryModel');
const ArticleModel = require('../../models/ArticleModel');
const authUtils = require('../../utils/authUtils');
const articleUtils = require('../../utils/articleUtils');
const validation = require('../../validation/user/validateArticle');
const upload = require('../../config/upload-setup');

module.exports = function(userRouter) {
    
    userRouter.get(
        '/articles',
        async (req, res) => {
            const returnFields = '_id title interaction status categoryId authorId updated createdAt';
            const articles = await ArticleModel
                .find({authorId: authUtils.getAuthorProfile(req).id}, returnFields)
                .populate({
                    path: 'categoryId',
                    select: '_id name'
                });

            res.render('user/article/article_base', {
                content: 'article_list',
                header: 'Article',
                articles: articles,
                information: authUtils.getAuthorProfile(req)
            });
        }
    );

    userRouter.get(
        '/articles/preview/:articleId',
        async (req,res) => {
            try {
                const article = await ArticleModel
                    .findOne({_id: req.params.articleId})
                    .populate({
                        path: 'categoryId',
                        select: '_id name'
                    })
                    .populate({
                        path: 'authorId',
                        select: '_id profile'
                    });
                if (article) {
                    return res.render('user/article/article_base', {
                        content: 'article_preview',
                        header: 'Article',
                        article: article,
                        information: authUtils.getAuthorProfile(req)
                    });
                }
                return res.render(
                    "pages/404", 
                    {redirectLink: '/articles'}
                  );
            } catch (error) {
                return res.render(
                    "pages/404", 
                    {redirectLink: '/articles'}
                  );
            }

        }
    );

    userRouter.get(
        '/articles/add',
        async (req, res) => {
            const categories = await CategoryModel.find({status: 'Activated'});
            
            res.render('user/article/article_base', {
                content: 'article_add',
                header: 'Article',
                categories: categories,
                information: authUtils.getAuthorProfile(req)
            });
        }
    );

    userRouter.post(
        '/articles/add',
        upload.fields([
            { name: 'thumbnail_img', maxCount: 1 },
            { name: 'files', maxCount: 3 }
          ]),
          validation.add,
        async (req, res) => {
            try {
                    
                const { hasError, errors, validInput } = validation.result(req);
                
                if(hasError) {
                    const categories = await CategoryModel.find({status: 'Activated'});
                    return  res.render('user/article/article_base',{
                        errors: errors, 
                        validInput: validInput,
                        content: 'article_add',
                        header: 'Article',
                        categories: categories,
                        information: authUtils.getAuthorProfile(req)
                    });
                };
                const article = await articleUtils.createNewArticle(
                    {
                        authorId: req.body.authorId,
                        categoryId: req.body.categoryId,
                        title: req.body.title,
                        summary: req.body.summary,
                        thumbnail_img: req.files.thumbnail_img[0], 
                        body: req.body.body,
                        publishCheck: req.body.publishCheck
                    });
                
                if(article) {
                    req.flash('success', 'Successfully! You created a new article');
                    return res.redirect('/articles/add');
                }

                req.flash('fail', 'Failed! An error occurred during the process.');
                return res.redirect('/articles/add');
            } catch (error) {
                req.flash('fail', 'Failed! An error occurred during the process.');
                return res.redirect('/articles/add');
            }
        }
    );

    userRouter.get(
        "/articles/update/:articleId",
        async (req, res) => {
          try {
            const categories = await CategoryModel.find({status: 'Activated'});
            const article = await ArticleModel
            .findOne({_id: req.params.articleId})
            .populate({
                path: 'categoryId',
                select: '_id name'
            });
            
            if(article) {
              return res.render(
                  "user/article/article_base", 
                    { 
                        content: 'articles',
                        content: 'article_update',
                        header: 'Article',
                        article: article,
                        categories: categories,
                        information: authUtils.getAuthorProfile(req)
                    });
            }
  
            return res.render(
                "pages/404", 
                {redirectLink: '/articles'}
              );
          } catch (error) {
              return res.render(
                  "pages/404", 
                  {redirectLink: '/articles'}
                );
          }
        }
      );

      userRouter.post(
        "/articles/update/:articleId", 
        upload.fields([
            { name: 'thumbnail_img', maxCount: 1 },
            { name: 'files', maxCount: 3 }
          ]),
        validation.add,
        async (req, res) => {
            try {
                const categories = await CategoryModel.find({status: 'Activated'});
                const article = await ArticleModel
                    .findOne({_id: req.params.articleId})
                    .populate({
                        path: 'categoryId',
                        select: '_id name'
                    });
                
                if (article){
                    const { hasError, errors, validInput } = validation.result(req);
            
                    if(hasError) { 
                        return  res.render(
                            "user/article/article_base", 
                            { 
                                errors: errors, 
                                validInput: validInput,
                                content: 'article_update',
                                header: 'Article',
                                article: article,
                                categories: categories,
                                information: authUtils.getAuthorProfile(req)
                            });
                    };
                    const old_thumbnail = article.thumbnail_img;
                    const thumbnail = (req.files.thumbnail_img)
                        ? req.files.thumbnail_img[0]
                        : {
                            path: article.thumbnail_img.path,
                            mimetype: article.thumbnail_img.contentType,
                            filename: article.thumbnail_img.filename,
                            size: article.thumbnail_img.size
                          };
                    const updateQuery = await articleUtils.updateArticle(
                        req.params.article_id,
                        {
                            categoryId: req.body.categoryId,
                            title: req.body.title,
                            summary: req.body.summary,
                            thumbnail_img: thumbnail, 
                            body: req.body.body
                        });
                    
                    if (updateQuery && updateQuery.ok === 1 && updateQuery.nModified === 1){
                        // Remove old thumbnail
                        if (req.files.thumbnail_img) {
                            const fs = require('fs');
                            const path = require('path');
                            fs.unlinkSync(path.join(process.cwd(),old_thumbnail.path));
                        }

                        req.flash('success', 'Successfully. All changes were saved.');
                        return res.redirect("/articles");
                    }

                    req.flash('fail', 'Failed. An error occurred during the process.');
                    return res.redirect("/articles");
                }
                
                return res.render(
                    "pages/404", 
                    {redirectLink: '/articles'}
                );
            } catch (error) {
                return res.render(
                    "pages/404", 
                    {redirectLink: '/articles'}
                );
            }
    });

    userRouter.post(
        "/articles/publish", 
        async (req, res) => {
        try {
            const article = await ArticleModel.findOneAndUpdate(
                { $and: [{_id: req.body.id}, {status: 'Draft'}] },
                { status: 'Pending'} );
            
            if (article) {
                req.flash("success", "Successfully. The article was waiting for approval.");
            } else {
                req.flash("fail", "Failed. An error occurred during the process.");
            }

            return res.redirect("/articles");
        } catch (error) {
            return res.render(
                "pages/404", 
                {redirectLink: '/articles'}
            );
        }}
    );

    userRouter.post(
        "/articles/unpublish", 
        async (req, res) => {
        try {
            const article = await ArticleModel.findOneAndUpdate(
                { $and: [{_id: req.body.id}, 
                    {$or: [{status: 'Published'},{status: 'Pending'}]} ] 
                },
                { status: 'Draft'} );
            
            if (article) {
                req.flash("success", "Successfully. The article was unpublished.");
            } else {
                req.flash("fail", "Failed. An error occurred during the process.");
            }

            return res.redirect("/articles");
        } catch (error) {
            return res.render(
                "pages/404", 
                {redirectLink: '/articles'}
            );
        }}
    );

    userRouter.post(
        "/articles/delete/", 
        async (req, res) => {
        try {
            const article = await ArticleModel.findByIdAndDelete(req.body.id);
            
            if (article) {
                req.flash("success", "Successfully. The article was removed.");
            } else {
                req.flash("fail", "Failed. An error occurred during the process");
            }
            return res.redirect("/articles");
        } catch (error) {
            return res.render(
                "pages/404", 
                {redirectLink: '/articles'}
            );
        }}
    );
};