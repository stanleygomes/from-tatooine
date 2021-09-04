const _ = require('lodash')
const Promise = require('bluebird')
const path = require('path')
const { supportedLanguages } = require('./i18n')

exports.createPages = ({ graphql, actions }) => {
  const { createPage, createRedirect } = actions

  createRedirect({
    fromPath: '/wallpapers',
    toPath: 'http://lightroom.adobe.com/shares/31e9598c1c4a4a77b3271a7ff11a43ed',
    isPermanent: true,
    redirectInBrowser: true
  })

  // Oops
  createRedirect({
    fromPath: '/url-incorrect/',
    toPath: '/url-correct/',
    isPermanent: true,
    redirectInBrowser: true
  })

  // Oops
  createRedirect({
    fromPath: '/nodetello-first-release/',
    toPath: '/nodevader-first-release/',
    isPermanent: true,
    redirectInBrowser: true
  })

  return new Promise((resolve, reject) => {
    const blogPost = path.resolve('./src/templates/blog-post.js')

    // Create index pages for all supported languages
    Object.keys(supportedLanguages).forEach((langKey) => {
      createPage({
        path: langKey === 'en' ? '/' : `/${langKey}/`,
        component: path.resolve('./src/templates/blog-index.js'),
        context: {
          langKey
        }
      })
    })

    resolve(
      graphql(
        `
          {
            allMarkdownRemark(
              sort: { fields: [frontmatter___date], order: DESC }
              limit: 1000
            ) {
              edges {
                node {
                  fields {
                    slug
                    langKey
                    directoryName
                  }
                  frontmatter {
                    title
                  }
                }
              }
            }
          }
        `
      ).then((result) => {
        if (result.errors) {
          console.log(result.errors)
          reject(result.errors)
          return
        }

        // Create blog posts pages.
        const posts = result.data.allMarkdownRemark.edges
        const allSlugs = _.reduce(
          posts,
          (result, post) => {
            result.add(post.node.fields.slug)
            return result
          },
          new Set()
        )

        const translationsByDirectory = _.reduce(
          posts,
          (result, post) => {
            const directoryName = _.get(post, 'node.fields.directoryName')
            const langKey = _.get(post, 'node.fields.langKey')

            if (directoryName && langKey && langKey !== 'en') {
              (result[directoryName] || (result[directoryName] = [])).push(
                langKey
              )
            }

            return result
          },
          {}
        )

        const defaultLangPosts = posts.filter(
          ({ node }) => node.fields.langKey === 'en'
        )
        _.each(defaultLangPosts, (post, index) => {
          const previous = index === defaultLangPosts.length - 1 ? null : defaultLangPosts[index + 1].node
          const next = index === 0 ? null : defaultLangPosts[index - 1].node
          const translations = translationsByDirectory[_.get(post, 'node.fields.directoryName')] || []

          createPage({
            path: post.node.fields.slug,
            component: blogPost,
            context: {
              slug: post.node.fields.slug,
              previous,
              next,
              translations,
              translatedLinks: []
            }
          })

          // eslint-disable-next-line no-unused-vars
          const otherLangPosts = posts.filter(
            ({ node }) => node.fields.langKey !== 'en'
          )
          _.each((otherLangPosts, post) => {
            const translations =
              translationsByDirectory[_.get(post, 'node.fields.directoryName')]

            // Record which links to internal posts have translated versions
            // into this language. We'll replace them before rendering HTML.
            const translatedLinks = []
            const { langKey, maybeAbsoluteLinks } = post.node.fields
            maybeAbsoluteLinks.forEach((link) => {
              if (allSlugs.has(link)) {
                if (allSlugs.has(`/${langKey}${link}`)) {
                  // This is legit an internal post link,
                  // and it has been already translated.
                  translatedLinks.push(link)
                } else if (link.startsWith(`/${langKey}/`)) {
                  console.log('-----------------')
                  console.error(
                    `It looks like "${langKey}" translation of "${post.node.frontmatter.title}" ` +
                      `is linking to a translated link: ${link}. Don't do this. Use the original link. ` +
                      'The blog post renderer will automatically use a translation if it is available.'
                  )
                  console.log('-----------------')
                }
              }
            })

            createPage({
              path: post.node.fields.slug,
              component: blogPost,
              context: {
                slug: post.node.fields.slug,
                translations,
                translatedLinks
              }
            })
          })
        })
      })
    )
  })
}

exports.onCreateNode = ({ node, actions }) => {
  const { createNodeField } = actions

  if (_.get(node, 'internal.type') === 'MarkdownRemark') {
    createNodeField({
      node,
      name: 'directoryName',
      value: path.basename(path.dirname(_.get(node, 'fileAbsolutePath')))
    })

    // Capture a list of what looks to be absolute internal links.
    // We'll later remember which of them have translations,
    // and use that to render localized internal links when available.

    // TODO: check against links with no trailing slashes
    // or that already link to translations.
    const markdown = node.internal.content
    const maybeAbsoluteLinks = []
    // eslint-disable-next-line no-useless-escape
    const linkRe = /\]\((\/[^\)]+\/)\)/g
    let match = linkRe.exec(markdown)
    while (match !== null) {
      maybeAbsoluteLinks.push(match[1])
      match = linkRe.exec(markdown)
    }
    createNodeField({
      node,
      name: 'maybeAbsoluteLinks',
      value: _.uniq(maybeAbsoluteLinks)
    })
  }
}
