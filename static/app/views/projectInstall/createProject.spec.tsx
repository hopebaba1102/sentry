import {render, screen, userEvent} from 'sentry-test/reactTestingLibrary';

import {openCreateTeamModal} from 'sentry/actionCreators/modal';
import TeamStore from 'sentry/stores/teamStore';
import {CreateProject} from 'sentry/views/projectInstall/createProject';

jest.mock('sentry/actionCreators/modal');

describe('CreateProject', function () {
  const organization = TestStubs.Organization();
  const teamNoAccess = TestStubs.Team({
    slug: 'test',
    id: '1',
    name: 'test',
    hasAccess: false,
  });

  const teamWithAccess = {...teamNoAccess, hasAccess: true};

  beforeEach(() => {
    TeamStore.reset();
    TeamStore.loadUserTeams([teamNoAccess]);

    MockApiClient.addMockResponse({
      url: `/projects/testOrg/rule-conditions/`,
      body: {},
      // Not required for these tests
      statusCode: 500,
    });
  });

  afterEach(() => {
    MockApiClient.clearMockResponses();
  });

  it('should block if you have access to no teams', function () {
    const {container} = render(<CreateProject />, {
      context: TestStubs.routerContext([{organization: {id: '1', slug: 'testOrg'}}]),
    });
    expect(container).toSnapshot();
  });

  it('can create a new team', async function () {
    render(<CreateProject />, {
      context: TestStubs.routerContext([{organization: {id: '1', slug: 'testOrg'}}]),
    });

    await userEvent.click(screen.getByRole('button', {name: 'Create a team'}));
    expect(openCreateTeamModal).toHaveBeenCalled();
  });

  it('should fill in project name if its empty when platform is chosen', async function () {
    const {container} = render(<CreateProject />, {
      context: TestStubs.routerContext([{organization: {id: '1', slug: 'testOrg'}}]),
      organization,
    });

    await userEvent.click(screen.getByTestId('platform-apple-ios'));
    expect(screen.getByPlaceholderText('project-name')).toHaveValue('apple-ios');

    await userEvent.click(screen.getByTestId('platform-ruby-rails'));
    expect(screen.getByPlaceholderText('project-name')).toHaveValue('ruby-rails');

    // but not replace it when project name is something else:
    await userEvent.clear(screen.getByPlaceholderText('project-name'));
    await userEvent.type(screen.getByPlaceholderText('project-name'), 'another');

    await userEvent.click(screen.getByTestId('platform-apple-ios'));
    expect(screen.getByPlaceholderText('project-name')).toHaveValue('another');

    expect(container).toSnapshot();
  });

  describe('Issue Alerts Options', function () {
    beforeEach(() => {
      TeamStore.loadUserTeams([teamWithAccess]);

      MockApiClient.addMockResponse({
        url: `/projects/${organization.slug}/rule-conditions/`,
        // @ts-ignore TODO: fix this type
        body: TestStubs.MOCK_RESP_VERBOSE,
      });
    });

    afterEach(() => {
      MockApiClient.clearMockResponses();
    });

    it('should enabled the submit button if and only if all the required information has been filled', async function () {
      render(<CreateProject />);

      const createProjectButton = screen.getByRole('button', {name: 'Create Project'});

      await userEvent.click(screen.getByText(/When there are more than/));
      expect(createProjectButton).toBeDisabled();

      await userEvent.type(screen.getByTestId('range-input'), '2');
      expect(screen.getByTestId('range-input')).toHaveValue(2);
      expect(createProjectButton).toBeDisabled();

      await userEvent.click(screen.getByTestId('platform-apple-ios'));
      expect(createProjectButton).toBeEnabled();

      await userEvent.clear(screen.getByTestId('range-input'));
      expect(createProjectButton).toBeDisabled();

      await userEvent.type(screen.getByTestId('range-input'), '2712');
      expect(createProjectButton).toBeEnabled();

      await userEvent.clear(screen.getByTestId('range-input'));
      expect(createProjectButton).toBeDisabled();

      await userEvent.click(screen.getByText("I'll create my own alerts later"));
      expect(createProjectButton).toBeEnabled();
    });
  });
});