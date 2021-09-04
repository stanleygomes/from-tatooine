/* eslint-disable react/prop-types */
/* eslint-disable prefer-destructuring */
import { Link, graphql } from 'gatsby'
import { formatPostDate, formatReadingTime } from '../utils/helpers'

import Bio from '../components/Bio'
import Footer from '../components/Footer'
import Layout from '../components/Layout'
import React from 'react'
import SEO from '../components/SEO'
import get from 'lodash/get'
import { ListItemTitleStyled } from '../style/custom'

class BlogIndexTemplate extends React.Component {
  render () {
    const siteTitle = get(this, 'props.data.site.siteMetadata.title')
    const langKey = this.props.pageContext.langKey

    const posts = get(this, 'props.data.allMarkdownRemark.edges')

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO />
        <aside>
          <Bio />
        </aside>
        <main>
          {posts.map(({ node }) => {
            if (!node.frontmatter.published) {
              return false
            }

            const title = get(node, 'frontmatter.title') || node.fields.slug
            return (
              <article key={node.fields.slug}>
                <header>
                  <ListItemTitleStyled>
                    <Link
                      style={{ boxShadow: 'none' }}
                      to={node.fields.slug}
                      rel="bookmark"
                    >
                      {title}
                    </Link>
                  </ListItemTitleStyled>
                  <small>
                    {formatPostDate(node.frontmatter.date, langKey)}
                    {` • ${formatReadingTime(node.timeToRead)}`}
                  </small>
                  <div>
                    <small translate="no">Tags: {node.frontmatter.tags}</small>
                  </div>
                </header>
                <p
                  dangerouslySetInnerHTML={{ __html: node.frontmatter.spoiler }}
                />
              </article>
            )
          })}
        </main>
        <Footer />
      </Layout>
    )
  }
}

export default BlogIndexTemplate

export const pageQuery = graphql`
  query($langKey: String!) {
    site {
      siteMetadata {
        title
        description
      }
    }
    allMarkdownRemark(
      filter: { fields: { langKey: { eq: $langKey } } }
      sort: { fields: [frontmatter___date], order: DESC }
    ) {
      edges {
        node {
          fields {
            slug
            langKey
          }
          timeToRead
          frontmatter {
            date(formatString: "MMMM DD, YYYY")
            title
            spoiler
            tags
            published
          }
        }
      }
    }
  }
`
