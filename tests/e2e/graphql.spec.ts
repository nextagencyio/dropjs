import { test, expect, apiPost, apiGet } from './fixtures';

/**
 * Helper to send a GraphQL query via POST.
 */
async function graphqlQuery(
  page: any,
  query: string,
  variables?: Record<string, unknown>
) {
  const resp = await page.request.post('/api/graphql', {
    data: { query, variables },
  });
  return resp;
}

/**
 * Helper to send an authenticated GraphQL query via POST.
 */
async function graphqlQueryAuth(
  page: any,
  token: string,
  query: string,
  variables?: Record<string, unknown>
) {
  const resp = await page.request.post('/api/graphql', {
    data: { query, variables },
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp;
}

test.describe('GraphQL API', () => {
  // Ensure a content type exists before running tests
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await apiPost(page, '/api/entity-types', {
      entity_type: 'node',
      bundle: 'gql_test',
      label: 'GraphQL Test',
      description: 'Content type for GraphQL testing',
    }).catch(() => {}); // Ignore if already exists
  });

  test('should query entity types', async ({ page }) => {
    const resp = await graphqlQuery(page, `
      {
        entityTypes {
          entity_type
          bundle
          label
        }
      }
    `);

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.data).toBeDefined();
    expect(body.data.entityTypes).toBeDefined();
    expect(Array.isArray(body.data.entityTypes)).toBe(true);
    expect(body.data.entityTypes.length).toBeGreaterThan(0);

    // Each entry should have entity_type, bundle, label
    const first = body.data.entityTypes[0];
    expect(first.entity_type).toBeDefined();
    expect(first.bundle).toBeDefined();
    expect(first.label).toBeDefined();
  });

  test('should create and query a node via mutations', async ({
    authenticatedPage: page,
    authToken,
  }) => {
    // Create a node via GraphQL mutation
    const createResp = await graphqlQueryAuth(
      page,
      authToken,
      `
      mutation CreateNode($type: String!, $input: NodeInput!) {
        createNode(type: $type, input: $input) {
          nid
          title
          status
          type
        }
      }
    `,
      {
        type: 'gql_test',
        input: {
          title: 'GraphQL Created Node',
          status: 1,
        },
      }
    );

    expect(createResp.status()).toBe(200);
    const createBody = await createResp.json();
    expect(createBody.errors).toBeUndefined();
    expect(createBody.data.createNode).toBeDefined();
    expect(createBody.data.createNode.title).toBe('GraphQL Created Node');
    expect(createBody.data.createNode.nid).toBeGreaterThan(0);
    expect(createBody.data.createNode.type).toBe('gql_test');

    const nid = createBody.data.createNode.nid;

    // Query the node back
    const queryResp = await graphqlQuery(page, `
      {
        node(nid: ${nid}) {
          nid
          title
          status
          type
        }
      }
    `);

    expect(queryResp.status()).toBe(200);
    const queryBody = await queryResp.json();
    expect(queryBody.errors).toBeUndefined();
    expect(queryBody.data.node).toBeDefined();
    expect(queryBody.data.node.nid).toBe(nid);
    expect(queryBody.data.node.title).toBe('GraphQL Created Node');
    expect(queryBody.data.node.type).toBe('gql_test');
  });

  test('should query nodes with filters', async ({
    authenticatedPage: page,
    authToken,
  }) => {
    // Create two nodes
    await graphqlQueryAuth(page, authToken, `
      mutation {
        createNode(type: "gql_test", input: { title: "Filter Test A", status: 1 }) { nid }
      }
    `);
    await graphqlQueryAuth(page, authToken, `
      mutation {
        createNode(type: "gql_test", input: { title: "Filter Test B", status: 1 }) { nid }
      }
    `);

    // Query with type filter
    const resp = await graphqlQuery(page, `
      {
        nodes(type: "gql_test", limit: 100) {
          nid
          title
          type
          status
        }
      }
    `);

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.nodes).toBeDefined();
    expect(Array.isArray(body.data.nodes)).toBe(true);

    // At least 2 nodes with type gql_test
    expect(body.data.nodes.length).toBeGreaterThanOrEqual(2);
    for (const node of body.data.nodes) {
      expect(node.type).toBe('gql_test');
    }
  });

  test('should create node via mutation', async ({
    authenticatedPage: page,
    authToken,
  }) => {
    const resp = await graphqlQueryAuth(page, authToken, `
      mutation {
        createNode(type: "gql_test", input: { title: "Mutation Test Node" }) {
          nid
          title
          status
        }
      }
    `);

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.createNode.title).toBe('Mutation Test Node');
    expect(body.data.createNode.nid).toBeGreaterThan(0);
    // Default status should be 1
    expect(body.data.createNode.status).toBe(1);
  });

  test('should delete node via mutation', async ({
    authenticatedPage: page,
    authToken,
  }) => {
    // First create a node
    const createResp = await graphqlQueryAuth(page, authToken, `
      mutation {
        createNode(type: "gql_test", input: { title: "To Be Deleted" }) { nid }
      }
    `);
    const createBody = await createResp.json();
    const nid = createBody.data.createNode.nid;

    // Delete the node
    const deleteResp = await graphqlQueryAuth(page, authToken, `
      mutation {
        deleteNode(nid: ${nid}) {
          success
          nid
        }
      }
    `);

    expect(deleteResp.status()).toBe(200);
    const deleteBody = await deleteResp.json();
    expect(deleteBody.errors).toBeUndefined();
    expect(deleteBody.data.deleteNode.success).toBe(true);
    expect(deleteBody.data.deleteNode.nid).toBe(nid);

    // Verify the node is gone
    const queryResp = await graphqlQuery(page, `
      {
        node(nid: ${nid}) {
          nid
          title
        }
      }
    `);

    const queryBody = await queryResp.json();
    expect(queryBody.data.node).toBeNull();
  });

  test('should query taxonomy terms', async ({
    authenticatedPage: page,
    authToken,
  }) => {
    // First, ensure a vocabulary exists
    await apiPost(page, '/api/taxonomy/vocabularies', {
      vid: 'gql_tags',
      name: 'GraphQL Tags',
      description: 'Test vocabulary for GraphQL',
    }).catch(() => {});

    // Create a taxonomy term via REST API
    await apiPost(page, '/api/taxonomy_term/gql_tags', {
      title: 'GraphQL Tag 1',
      status: true,
    });

    // Query taxonomy terms via GraphQL
    const resp = await graphqlQuery(page, `
      {
        taxonomyTerms(type: "gql_tags") {
          tid
          title
          type
          status
        }
      }
    `);

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.taxonomyTerms).toBeDefined();
    expect(Array.isArray(body.data.taxonomyTerms)).toBe(true);
    expect(body.data.taxonomyTerms.length).toBeGreaterThanOrEqual(1);

    const term = body.data.taxonomyTerms.find(
      (t: any) => t.title === 'GraphQL Tag 1'
    );
    expect(term).toBeDefined();
    expect(term.type).toBe('gql_tags');
  });

  test('should support introspection query', async ({ page }) => {
    const resp = await graphqlQuery(page, `
      {
        __schema {
          queryType {
            name
          }
          mutationType {
            name
          }
          types {
            name
            kind
          }
        }
      }
    `);

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.errors).toBeUndefined();
    expect(body.data.__schema).toBeDefined();
    expect(body.data.__schema.queryType.name).toBe('Query');
    expect(body.data.__schema.mutationType.name).toBe('Mutation');
    expect(body.data.__schema.types).toBeDefined();
    expect(Array.isArray(body.data.__schema.types)).toBe(true);

    // Should contain our custom types
    const typeNames = body.data.__schema.types.map((t: any) => t.name);
    expect(typeNames).toContain('GenericNode');
    expect(typeNames).toContain('EntityTypeInfo');
    expect(typeNames).toContain('DeleteResult');
  });

  test('should update a node via mutation', async ({
    authenticatedPage: page,
    authToken,
  }) => {
    // Create a node first
    const createResp = await graphqlQueryAuth(page, authToken, `
      mutation {
        createNode(type: "gql_test", input: { title: "Before Update" }) { nid title }
      }
    `);
    const createBody = await createResp.json();
    const nid = createBody.data.createNode.nid;

    // Update the node
    const updateResp = await graphqlQueryAuth(page, authToken, `
      mutation {
        updateNode(nid: ${nid}, input: { title: "After Update" }) {
          nid
          title
        }
      }
    `);

    expect(updateResp.status()).toBe(200);
    const updateBody = await updateResp.json();
    expect(updateBody.errors).toBeUndefined();
    expect(updateBody.data.updateNode.nid).toBe(nid);
    expect(updateBody.data.updateNode.title).toBe('After Update');
  });

  test('should handle GET with query parameter', async ({ page }) => {
    const resp = await page.request.get(
      '/api/graphql?query=' +
        encodeURIComponent('{ entityTypes { entity_type bundle label } }')
    );

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.data).toBeDefined();
    expect(body.data.entityTypes).toBeDefined();
  });

  test('should return errors for invalid queries', async ({ page }) => {
    const resp = await graphqlQuery(page, `
      { nonExistentField }
    `);

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.errors).toBeDefined();
    expect(body.errors.length).toBeGreaterThan(0);
  });

  test('should return playground HTML on GET without query param', async ({
    page,
  }) => {
    const resp = await page.request.get('/api/graphql');
    expect(resp.status()).toBe(200);
    const text = await resp.text();
    expect(text).toContain('GraphQL Playground');
    expect(text).toContain('<!DOCTYPE html>');
  });
});
