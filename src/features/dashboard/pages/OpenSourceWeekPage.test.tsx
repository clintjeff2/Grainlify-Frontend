import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenSourceWeekPage } from './OpenSourceWeekPage';
import { getOpenSourceWeekEvents } from '../../../shared/api/client';

vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('../../../shared/api/client', () => ({
  getOpenSourceWeekEvents: vi.fn(),
}));

const mockGetEvents = vi.mocked(getOpenSourceWeekEvents);

const MOCK_EVENTS = [
  {
    id: 'evt-1',
    title: 'Hackathon 2024',
    description: 'A week of open source contributions.',
    location: 'Online',
    status: 'upcoming',
    start_at: '2024-07-01T09:00:00Z',
    end_at: '2024-07-07T18:00:00Z',
    created_at: '2024-06-01T09:00:00Z',
    updated_at: '2024-06-01T09:00:00Z',
  },
  {
    id: 'evt-2',
    title: 'Code Sprint',
    description: null,
    location: null,
    status: 'completed',
    start_at: '2024-06-01T09:00:00Z',
    end_at: '2024-06-07T18:00:00Z',
    created_at: '2024-05-01T09:00:00Z',
    updated_at: '2024-05-01T09:00:00Z',
  },
];

describe('OpenSourceWeekPage', () => {
  const onEventClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering states
  // ---------------------------------------------------------------------------

  it('renders the page heading', async () => {
    mockGetEvents.mockResolvedValue({ events: [] });
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    expect(screen.getByRole('heading', { name: 'Open-Source Week' })).toBeInTheDocument();
  });

  it('shows a loading skeleton while events are being fetched', () => {
    // Never resolves — simulates an in-flight request
    mockGetEvents.mockImplementation(() => new Promise(() => {}));
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    // Event cards must not appear yet
    expect(screen.queryByRole('button', { name: /hackathon/i })).not.toBeInTheDocument();
  });

  it('shows the empty-state message when the API returns no events', async () => {
    mockGetEvents.mockResolvedValue({ events: [] });
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    await waitFor(() =>
      expect(screen.getByText(/no open-source week events yet/i)).toBeInTheDocument(),
    );
  });

  it('shows the empty-state message when the fetch throws', async () => {
    mockGetEvents.mockRejectedValue(new Error('Network error'));
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    await waitFor(() =>
      expect(screen.getByText(/no open-source week events yet/i)).toBeInTheDocument(),
    );
  });

  it('renders a card for each event after loading', async () => {
    mockGetEvents.mockResolvedValue({ events: MOCK_EVENTS });
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hackathon 2024/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /code sprint/i })).toBeInTheDocument();
    });
  });

  it('falls back to "TBA" when a location is null', async () => {
    mockGetEvents.mockResolvedValue({ events: MOCK_EVENTS });
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    await waitFor(() => screen.getByRole('button', { name: /code sprint/i }));
    expect(screen.getByText('TBA')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Pointer interaction
  // ---------------------------------------------------------------------------

  it('calls onEventClick with id and title when a card is clicked', async () => {
    mockGetEvents.mockResolvedValue({ events: MOCK_EVENTS });
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    await waitFor(() => screen.getByRole('button', { name: /hackathon 2024/i }));

    await userEvent.click(screen.getByRole('button', { name: /hackathon 2024/i }));

    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith('evt-1', 'Hackathon 2024');
  });

  // ---------------------------------------------------------------------------
  // Keyboard accessibility (acceptance criteria)
  // ---------------------------------------------------------------------------

  it('event cards are keyboard-focusable (tabIndex=0)', async () => {
    mockGetEvents.mockResolvedValue({ events: MOCK_EVENTS });
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    await waitFor(() => screen.getByRole('button', { name: /hackathon 2024/i }));

    expect(screen.getByRole('button', { name: /hackathon 2024/i })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: /code sprint/i })).toHaveAttribute('tabindex', '0');
  });

  it('activates a card when Enter is pressed while the card is focused', async () => {
    const user = userEvent.setup();
    mockGetEvents.mockResolvedValue({ events: MOCK_EVENTS });
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    await waitFor(() => screen.getByRole('button', { name: /hackathon 2024/i }));

    const card = screen.getByRole('button', { name: /hackathon 2024/i });
    card.focus();
    await user.keyboard('{Enter}');

    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith('evt-1', 'Hackathon 2024');
  });

  it('activates a card when Space is pressed while the card is focused', async () => {
    const user = userEvent.setup();
    mockGetEvents.mockResolvedValue({ events: MOCK_EVENTS });
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    await waitFor(() => screen.getByRole('button', { name: /hackathon 2024/i }));

    const card = screen.getByRole('button', { name: /hackathon 2024/i });
    card.focus();
    await user.keyboard(' ');

    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith('evt-1', 'Hackathon 2024');
  });

  it('does not double-fire onEventClick when a key event bubbles from the nested Join Event button', async () => {
    const user = userEvent.setup();
    mockGetEvents.mockResolvedValue({ events: MOCK_EVENTS });
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    await waitFor(() => screen.getAllByRole('button', { name: /join event/i }));

    const joinBtn = screen.getAllByRole('button', { name: /join event/i })[0];
    joinBtn.focus();
    // Pressing Enter on the inner button fires a synthetic click that bubbles
    // to the card's onClick — that is one call and is intentional.
    // The card's onKeyDown guard (currentTarget === target) must NOT add a
    // second call.
    await user.keyboard('{Enter}');

    expect(onEventClick).toHaveBeenCalledTimes(1);
  });

  it('allows keyboard navigation between multiple cards via Tab', async () => {
    const user = userEvent.setup();
    mockGetEvents.mockResolvedValue({ events: MOCK_EVENTS });
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    await waitFor(() => screen.getByRole('button', { name: /hackathon 2024/i }));

    // Tab into the first card
    await user.tab();
    // At least one of the event cards (or the Join Event button) must be focused
    const focused = document.activeElement;
    expect(focused).not.toBeNull();
    expect(focused?.getAttribute('tabindex') === '0' || focused?.tagName === 'BUTTON').toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Accessible status badge
  // ---------------------------------------------------------------------------

  it('status badge includes a visually-hidden "Event status:" prefix', async () => {
    mockGetEvents.mockResolvedValue({ events: MOCK_EVENTS });
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    await waitFor(() => screen.getByText(/hackathon 2024/i));

    // sr-only spans are in the DOM even though they are visually hidden
    const srLabels = screen.getAllByText(/event status:/i);
    expect(srLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('status badge shows human-readable label for each status value', async () => {
    const events = [
      { ...MOCK_EVENTS[0], id: 'e1', status: 'upcoming', title: 'Upcoming Event' },
      { ...MOCK_EVENTS[0], id: 'e2', status: 'running', title: 'Running Event' },
      { ...MOCK_EVENTS[0], id: 'e3', status: 'completed', title: 'Completed Event' },
      { ...MOCK_EVENTS[0], id: 'e4', status: 'draft', title: 'Draft Event' },
    ];
    mockGetEvents.mockResolvedValue({ events });
    render(<OpenSourceWeekPage onEventClick={onEventClick} />);
    await waitFor(() => screen.getByText('Upcoming Event'));

    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
