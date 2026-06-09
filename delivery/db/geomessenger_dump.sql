--
-- PostgreSQL database dump
--

\restrict O32bzWVoyUZwMaMD6MmjupkGUv0fhUtXcQ5pAheWA9K0TI9O7xnmjbhAn4mKWn3

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.user_blocks DROP CONSTRAINT IF EXISTS user_blocks_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_blocks DROP CONSTRAINT IF EXISTS user_blocks_blocked_by_fkey;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS reports_resolved_by_fkey;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS reports_reported_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS reports_reason_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS reports_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS reports_comment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_type_id_fkey;
ALTER TABLE IF EXISTS ONLY public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.comments DROP CONSTRAINT IF EXISTS comments_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.comment_likes DROP CONSTRAINT IF EXISTS comment_likes_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.comment_likes DROP CONSTRAINT IF EXISTS comment_likes_comment_id_fkey;
DROP INDEX IF EXISTS public.idx_users_role;
DROP INDEX IF EXISTS public.idx_users_is_blocked;
DROP INDEX IF EXISTS public.idx_user_blocks_active;
DROP INDEX IF EXISTS public.idx_reports_status;
DROP INDEX IF EXISTS public.idx_reports_event;
DROP INDEX IF EXISTS public.idx_reports_comment;
DROP INDEX IF EXISTS public.idx_events_type_id;
DROP INDEX IF EXISTS public.idx_events_lat_lng;
DROP INDEX IF EXISTS public.idx_events_expires_at;
DROP INDEX IF EXISTS public.idx_events_archived;
DROP INDEX IF EXISTS public.idx_events_active;
DROP INDEX IF EXISTS public.idx_comments_user;
DROP INDEX IF EXISTS public.idx_comments_event;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.user_blocks DROP CONSTRAINT IF EXISTS user_blocks_pkey;
ALTER TABLE IF EXISTS ONLY public.comment_likes DROP CONSTRAINT IF EXISTS unique_user_comment_like;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS reports_pkey;
ALTER TABLE IF EXISTS ONLY public.report_reasons DROP CONSTRAINT IF EXISTS report_reasons_pkey;
ALTER TABLE IF EXISTS ONLY public.report_reasons DROP CONSTRAINT IF EXISTS report_reasons_name_key;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_pkey;
ALTER TABLE IF EXISTS ONLY public.event_types DROP CONSTRAINT IF EXISTS event_types_pkey;
ALTER TABLE IF EXISTS ONLY public.event_types DROP CONSTRAINT IF EXISTS event_types_name_key;
ALTER TABLE IF EXISTS ONLY public.comments DROP CONSTRAINT IF EXISTS comments_pkey;
ALTER TABLE IF EXISTS ONLY public.comment_likes DROP CONSTRAINT IF EXISTS comment_likes_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.user_blocks ALTER COLUMN block_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.reports ALTER COLUMN report_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.report_reasons ALTER COLUMN reason_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.events ALTER COLUMN event_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.event_types ALTER COLUMN type_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.comments ALTER COLUMN comment_id DROP DEFAULT;
ALTER TABLE IF EXISTS public.comment_likes ALTER COLUMN like_id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_user_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.user_blocks_block_id_seq;
DROP TABLE IF EXISTS public.user_blocks;
DROP SEQUENCE IF EXISTS public.reports_report_id_seq;
DROP TABLE IF EXISTS public.reports;
DROP SEQUENCE IF EXISTS public.report_reasons_reason_id_seq;
DROP TABLE IF EXISTS public.report_reasons;
DROP SEQUENCE IF EXISTS public.events_event_id_seq;
DROP TABLE IF EXISTS public.events;
DROP SEQUENCE IF EXISTS public.event_types_type_id_seq;
DROP TABLE IF EXISTS public.event_types;
DROP SEQUENCE IF EXISTS public.comments_comment_id_seq;
DROP TABLE IF EXISTS public.comments;
DROP SEQUENCE IF EXISTS public.comment_likes_like_id_seq;
DROP TABLE IF EXISTS public.comment_likes;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: comment_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_likes (
    like_id integer NOT NULL,
    user_id integer NOT NULL,
    comment_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: comment_likes_like_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comment_likes_like_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comment_likes_like_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comment_likes_like_id_seq OWNED BY public.comment_likes.like_id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    comment_id integer NOT NULL,
    user_id integer NOT NULL,
    event_id integer NOT NULL,
    text text NOT NULL,
    like_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: comments_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comments_comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comments_comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comments_comment_id_seq OWNED BY public.comments.comment_id;


--
-- Name: event_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_types (
    type_id integer NOT NULL,
    name character varying(50) NOT NULL,
    icon_url text,
    color_code character varying(7) DEFAULT '#1976D2'::character varying,
    description text,
    CONSTRAINT event_types_color_code_check CHECK (((color_code)::text ~ '^#[0-9A-Fa-f]{6}$'::text))
);


--
-- Name: event_types_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_types_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_types_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_types_type_id_seq OWNED BY public.event_types.type_id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    event_id integer NOT NULL,
    user_id integer NOT NULL,
    type_id integer NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    address character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    is_archived boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    archived_at timestamp with time zone
);


--
-- Name: events_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.events_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.events_event_id_seq OWNED BY public.events.event_id;


--
-- Name: report_reasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_reasons (
    reason_id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    priority integer DEFAULT 1 NOT NULL,
    CONSTRAINT report_reasons_priority_check CHECK (((priority >= 1) AND (priority <= 10)))
);


--
-- Name: report_reasons_reason_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_reasons_reason_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_reasons_reason_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_reasons_reason_id_seq OWNED BY public.report_reasons.reason_id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    report_id integer NOT NULL,
    reporter_id integer NOT NULL,
    reported_user_id integer,
    event_id integer,
    comment_id integer,
    reason_id integer NOT NULL,
    description text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by integer,
    CONSTRAINT chk_report_target CHECK (((reported_user_id IS NOT NULL) OR (event_id IS NOT NULL) OR (comment_id IS NOT NULL))),
    CONSTRAINT reports_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: reports_report_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_report_id_seq OWNED BY public.reports.report_id;


--
-- Name: user_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_blocks (
    block_id integer NOT NULL,
    user_id integer NOT NULL,
    blocked_by integer NOT NULL,
    reason text,
    blocked_at timestamp with time zone DEFAULT now() NOT NULL,
    unblock_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: user_blocks_block_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_blocks_block_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_blocks_block_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_blocks_block_id_seq OWNED BY public.user_blocks.block_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100),
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_blocked boolean DEFAULT false NOT NULL,
    avatar_emoji character varying(16),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: comment_likes like_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes ALTER COLUMN like_id SET DEFAULT nextval('public.comment_likes_like_id_seq'::regclass);


--
-- Name: comments comment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments ALTER COLUMN comment_id SET DEFAULT nextval('public.comments_comment_id_seq'::regclass);


--
-- Name: event_types type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_types ALTER COLUMN type_id SET DEFAULT nextval('public.event_types_type_id_seq'::regclass);


--
-- Name: events event_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events ALTER COLUMN event_id SET DEFAULT nextval('public.events_event_id_seq'::regclass);


--
-- Name: report_reasons reason_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_reasons ALTER COLUMN reason_id SET DEFAULT nextval('public.report_reasons_reason_id_seq'::regclass);


--
-- Name: reports report_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports ALTER COLUMN report_id SET DEFAULT nextval('public.reports_report_id_seq'::regclass);


--
-- Name: user_blocks block_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks ALTER COLUMN block_id SET DEFAULT nextval('public.user_blocks_block_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Data for Name: comment_likes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comment_likes (like_id, user_id, comment_id, created_at) FROM stdin;
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comments (comment_id, user_id, event_id, text, like_count, created_at, is_deleted, deleted_at) FROM stdin;
2	2	2	Правый ряд	0	2026-03-10 21:55:29.458893+03	f	\N
6	3	4	пока	0	2026-03-10 23:04:28.154483+03	f	\N
4	2	3	poka	0	2026-03-10 22:53:55.815806+03	f	\N
7	2	3	Привеь	0	2026-03-10 23:06:17.625543+03	f	\N
1	2	1	Открыт до 18:40	0	2026-03-10 21:54:22.112558+03	f	\N
8	2	6	Как дела	0	2026-03-10 23:24:47.505385+03	f	\N
10	3	7	Привет	0	2026-03-11 00:04:57.540355+03	t	2026-03-11 00:05:38.982201+03
9	2	7	пока	0	2026-03-11 00:04:22.456053+03	t	2026-03-11 00:06:00.632528+03
11	1	8	До 18:00	0	2026-03-11 00:07:10.586314+03	f	\N
12	4	9	Ку	0	2026-03-11 00:08:47.351935+03	t	2026-03-11 00:08:51.613746+03
13	1	10	Ээээ	0	2026-05-10 13:32:29.19862+03	f	\N
14	1	11	Ляляляляля	0	2026-05-12 10:26:21.815747+03	f	\N
15	6	12	Всем привет	0	2026-05-12 10:27:02.951665+03	f	\N
16	6	12	дела норм	0	2026-05-12 10:27:04.438899+03	f	\N
17	7	13	Левый ряд кошмар	0	2026-05-12 10:29:03.109203+03	f	\N
18	1	14	Hdjsbsndnx	0	2026-05-13 13:02:14.021191+03	t	2026-05-13 13:02:18.772456+03
19	8	17	АХАХАХАХХАХА	0	2026-05-13 13:05:16.526612+03	f	\N
20	9	18	Тестовый комментарий от пользователя A	0	2026-05-13 20:29:41.80445+03	f	\N
21	11	21	Пр	0	2026-05-13 22:17:41.555771+03	t	2026-05-13 22:18:27.12405+03
22	1	19	F	0	2026-05-13 22:20:49.239731+03	f	\N
23	1	19	F	0	2026-05-13 22:20:49.641042+03	f	\N
25	1	19	Ffc	0	2026-05-13 22:20:50.068365+03	f	\N
24	1	19	Ff	0	2026-05-13 22:20:49.850525+03	t	2026-05-13 22:21:00.140945+03
26	12	24	Ойойойой	0	2026-06-08 13:53:23.486595+03	f	\N
27	12	24	блин блин блин	0	2026-06-08 13:53:27.09298+03	f	\N
28	12	25	Хахахахахаха	0	2026-06-08 13:54:23.373833+03	f	\N
29	12	25	Оьман	0	2026-06-08 13:54:25.343715+03	f	\N
30	13	24	Ойойойой	0	2026-06-08 13:58:10.907365+03	f	\N
31	13	24	А	0	2026-06-08 13:58:18.676267+03	f	\N
32	13	24	А	0	2026-06-08 13:58:18.983078+03	f	\N
33	13	24	А	0	2026-06-08 13:58:19.229446+03	f	\N
\.


--
-- Data for Name: event_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_types (type_id, name, icon_url, color_code, description) FROM stdin;
1	accident	\N	#E53935	ДТП
2	police	\N	#1E88E5	Пост ДПС
3	chat	\N	#43A047	Чат/обсуждение
4	official	\N	#8E24AA	Официальное событие
5	other	\N	#757575	Другое
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.events (event_id, user_id, type_id, title, description, latitude, longitude, address, created_at, expires_at, is_archived, is_active, archived_at) FROM stdin;
2	2	1	ДТП	1	55.79595254	49.12242479	\N	2026-03-10 21:55:20.370614+03	\N	t	f	2026-03-10 22:02:15.886212+03
3	2	1	ДТП	правый ряд	55.79308235	49.15217140	\N	2026-03-10 22:53:47.597121+03	\N	t	f	2026-03-10 23:07:01.580824+03
4	3	5	Опасность	яма	55.79560836	49.12247207	\N	2026-03-10 23:04:12.253808+03	\N	t	t	2026-03-10 23:07:13.931029+03
5	1	4	Фестиваль еды	еда	55.79628900	49.10879500	\N	2026-03-10 23:07:49.55985+03	2026-03-10 03:00:00+03	t	t	2026-03-10 23:09:35.034069+03
6	2	3	Как оно	1	55.79968090	49.12805293	\N	2026-03-10 23:24:16.570463+03	\N	t	f	2026-03-11 00:03:19.309104+03
1	2	5	Городской каток	1	55.77899909	49.12331413	\N	2026-03-10 21:54:04.045777+03	\N	t	f	2026-03-11 00:03:20.965198+03
7	2	3	Чат	1	55.79477842	49.13648586	\N	2026-03-11 00:04:13.4073+03	\N	t	t	2026-03-11 00:06:11.560678+03
8	1	4	Фестиваль мороженого	1	55.80142876	49.11238474	\N	2026-03-11 00:06:50.132545+03	2026-03-11 03:00:00+03	t	t	2026-03-11 00:07:24.431444+03
9	4	1	ДТП	правый ряд	55.78354342	49.14621211	\N	2026-03-11 00:08:39.947312+03	\N	t	f	2026-03-11 00:08:53.296663+03
10	5	3	Привет	привет	55.78965247	49.14007874	\N	2026-05-10 13:27:52.200966+03	\N	t	t	2026-05-12 10:26:36.685033+03
12	6	3	Привет	привет	55.79470554	49.13094450	\N	2026-05-12 10:26:57.004282+03	\N	t	f	2026-05-12 10:31:21.361766+03
11	1	4	Дорожные работы	лялялял	55.77842050	49.13679038	\N	2026-05-12 10:26:15.25043+03	2026-06-03 03:00:00+03	t	f	2026-05-12 10:31:29.178419+03
13	7	1	Ойойой	ойойойо	55.78674665	49.11321395	\N	2026-05-12 10:28:37.300203+03	\N	t	f	2026-05-12 10:31:38.287255+03
14	1	3	Djdjsj		55.78372659	49.14703760	\N	2026-05-13 13:02:09.686868+03	\N	t	f	2026-05-13 13:02:34.818274+03
16	1	3	Дудудубуду		55.79628900	49.10879500	\N	2026-05-13 13:03:25.323085+03	\N	t	f	2026-05-13 13:06:30.758975+03
17	1	5	Ахаххахаха		55.79628900	49.10879500	\N	2026-05-13 13:03:33.480548+03	\N	t	f	2026-05-13 14:10:47.798987+03
15	1	5	Ддвдвда		55.79628900	49.10879500	\N	2026-05-13 13:03:18.391761+03	\N	t	f	2026-05-13 14:10:49.560858+03
18	9	3	Тестовое событие Postman	Событие создано в рамках тестирования API GeoKZN	55.79628900	49.10879500	\N	2026-05-13 20:28:51.246505+03	\N	t	f	2026-05-13 22:13:16.409495+03
20	11	3	Gggg		55.79628900	49.10879500	\N	2026-05-13 22:15:59.829366+03	\N	t	t	2026-06-07 14:28:03.922332+03
21	11	5	New		55.79303748	49.13936870	\N	2026-05-13 22:17:10.587645+03	\N	t	t	2026-06-07 14:28:03.922332+03
19	11	5	Fff		55.79628900	49.10879500	\N	2026-05-13 22:15:52.678307+03	\N	t	t	2026-06-07 14:28:03.922332+03
23	12	1	G		55.96438078	48.90012982	\N	2026-06-07 16:29:43.671838+03	\N	t	f	2026-06-07 16:30:00.755461+03
22	12	5	U		55.76804671	48.95297427	\N	2026-06-07 16:29:04.469827+03	\N	t	f	2026-06-07 16:57:59.008295+03
24	12	1	Блин блин		55.79082339	49.16029073	\N	2026-06-08 13:53:19.15064+03	\N	f	t	\N
25	12	2	Аайайай		55.76517285	49.14560173	\N	2026-06-08 13:54:17.260415+03	\N	t	f	2026-06-08 13:56:32.077778+03
26	13	1	Ахаххахаха		55.77540235	48.90000000	\N	2026-06-08 13:59:03.580659+03	\N	f	t	\N
\.


--
-- Data for Name: report_reasons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.report_reasons (reason_id, name, description, priority) FROM stdin;
1	spam	Спам / реклама	5
2	abuse	Оскорбления / токсичность	7
3	fake	Недостоверная информация	8
4	other	Другое	1
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reports (report_id, reporter_id, reported_user_id, event_id, comment_id, reason_id, description, status, created_at, resolved_at, resolved_by) FROM stdin;
2	3	\N	\N	1	1	\N	rejected	2026-03-10 22:01:41.015737+03	2026-03-10 22:02:10.153061+03	1
1	3	\N	2	\N	3	\N	approved	2026-03-10 22:01:30.765782+03	2026-03-10 22:02:15.872192+03	1
4	3	\N	3	\N	3	\N	rejected	2026-03-10 22:54:51.458323+03	2026-03-10 22:55:49.425036+03	1
3	3	\N	\N	4	1	\N	approved	2026-03-10 22:54:45.95087+03	2026-03-10 22:55:53.632046+03	1
5	3	\N	3	\N	3	\N	approved	2026-03-10 23:04:48.053367+03	2026-03-10 23:07:01.567035+03	1
6	2	\N	\N	6	3	\N	rejected	2026-03-10 23:05:52.335194+03	2026-03-10 23:07:09.365484+03	1
7	3	\N	\N	8	3	\N	approved	2026-03-10 23:25:38.506029+03	2026-03-10 23:26:16.264819+03	1
9	3	\N	\N	9	2	\N	approved	2026-03-11 00:05:02.427407+03	2026-03-11 00:06:00.629019+03	1
10	3	\N	7	\N	3	\N	rejected	2026-03-11 00:05:07.727929+03	2026-03-11 00:06:04.232726+03	1
8	3	\N	1	\N	3	\N	rejected	2026-03-10 23:25:47.191843+03	2026-03-11 00:06:05.8827+03	1
13	7	\N	\N	15	1	\N	approved	2026-05-12 10:29:12.200547+03	2026-05-12 10:30:07.615157+03	1
12	7	\N	12	\N	1	\N	approved	2026-05-12 10:28:43.343747+03	2026-05-12 10:31:21.356831+03	1
11	6	\N	11	\N	3	\N	approved	2026-05-12 10:27:31.354761+03	2026-05-12 10:31:29.17745+03	1
14	8	\N	16	\N	1	\N	approved	2026-05-13 13:05:05.317441+03	2026-05-13 13:06:30.741138+03	1
15	6	\N	\N	19	1	\N	rejected	2026-05-13 13:05:38.609082+03	2026-05-13 13:06:41.848819+03	1
16	6	\N	17	\N	4	\N	rejected	2026-05-13 13:05:45.595769+03	2026-05-13 13:06:43.559396+03	1
17	10	\N	18	\N	4	\N	approved	2026-05-13 20:35:13.108251+03	2026-05-13 22:13:16.390157+03	1
18	6	\N	19	\N	1	\N	rejected	2026-05-13 22:19:06.622133+03	2026-05-13 22:21:27.607365+03	1
20	13	\N	\N	27	2	\N	pending	2026-06-08 13:55:30.325449+03	\N	\N
19	13	\N	25	\N	3	\N	approved	2026-06-08 13:55:16.915232+03	2026-06-08 13:56:32.059544+03	1
\.


--
-- Data for Name: user_blocks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_blocks (block_id, user_id, blocked_by, reason, blocked_at, unblock_at, is_active) FROM stdin;
1	6	1	Blocked via report 13	2026-05-12 10:30:07.62044+03	\N	f
2	9	1	Blocked by admin	2026-05-13 20:37:58.450089+03	2026-05-13 21:37:58.446+03	f
3	9	1	Blocked by admin	2026-05-13 22:13:23.830954+03	\N	t
4	10	1	Blocked by admin	2026-05-13 22:13:26.74499+03	\N	t
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (user_id, username, email, role, password_hash, created_at, is_blocked, avatar_emoji) FROM stdin;
2	Test	\N	user	$2a$10$tkmIRURQX0rTjwH5P6HXzOoRWfC7xd.4ZY8h7UmZrHQpJuevBsAXq	2026-03-10 21:53:31.031986+03	f	\N
3	Test1	\N	user	$2a$10$Pag.bIO273aB3OHwyliU6e0qyspfUced.6Cf5ZgqiLf2zJJs0P0D.	2026-03-10 22:01:19.67712+03	f	\N
4	user	\N	user	$2a$10$ouzYSoV8jfaanThLdqBOjOZTaXJWQZIIOKweLPgFYvdve3MwNjteO	2026-03-11 00:08:13.266322+03	f	\N
5	User1	\N	user	$2a$10$LlY/au8IjizTpzSTZaqq1.NHXPvBwrwM8J1NzqZe7RACVEIYxo6DK	2026-05-10 13:26:49.216624+03	f	\N
7	testing	\N	user	$2a$10$Yv.6iM.ht1VsWZn/RPpFLewfyt.OpC6t1PA1YVzAdZU.VWmUNBcIu	2026-05-12 10:28:22.341465+03	f	\N
6	qwerty	\N	user	$2a$10$WrHpAXoIcb1ySSwKqJONuezFNHI8Fp7pTwhWAWehMqluDPbjYyiUu	2026-05-12 10:24:14.348657+03	f	\N
8	user11	\N	user	$2a$10$d0zmQY6gU3SFhk5XJJTUFeEXSu5k5v1UaQ0gfyrRm0MOYnW6/xFFy	2026-05-13 13:04:55.88254+03	f	\N
1	Admin	\N	admin	$2a$10$U98T0P7boUvpyddZuD0J5eCVEcVViiuszY/9xKnmgSPQcTVJw5DqW	2026-03-10 21:39:03.568224+03	f	🚗
11	testuser	\N	user	$2a$10$apyfmzXbpnsYa2Kmx66Dc.UP0jwBmZ.747EPSa.9HU4fPXfDy7MtW	2026-05-13 22:12:49.43594+03	f	\N
9	user_a_1778693231348	\N	user	$2a$10$kBWsJvGruy5eDF/dHiri5eb/kjRPIZHGKjP/tD7l/PlH9AUUcomWm	2026-05-13 20:27:11.543902+03	t	\N
10	user_b_1778693697167	\N	user	$2a$10$J.vDlprtCJcbGQW.FZjWpu/W18GbkGHhdhXGgKcvi9UA8yEZqOwbC	2026-05-13 20:34:57.372009+03	t	\N
12	log1	\N	user	$2a$10$fdxFuM.FFTkCyxi4b/TJtOqPn3IN1KVclRBzSwGLGNFh1wnXD4RXe	2026-06-07 15:24:29.524834+03	f	🚗
13	log	\N	user	$2a$10$Yw.VVgh.BLnolrHzhidXNe5uEoTowXFjOVaiuaGHDhiS8w5iMVzNe	2026-06-08 13:55:00.65576+03	f	\N
\.


--
-- Name: comment_likes_like_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comment_likes_like_id_seq', 1, false);


--
-- Name: comments_comment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comments_comment_id_seq', 33, true);


--
-- Name: event_types_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.event_types_type_id_seq', 105, true);


--
-- Name: events_event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.events_event_id_seq', 26, true);


--
-- Name: report_reasons_reason_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.report_reasons_reason_id_seq', 84, true);


--
-- Name: reports_report_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reports_report_id_seq', 20, true);


--
-- Name: user_blocks_block_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_blocks_block_id_seq', 4, true);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_user_id_seq', 13, true);


--
-- Name: comment_likes comment_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_pkey PRIMARY KEY (like_id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (comment_id);


--
-- Name: event_types event_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_name_key UNIQUE (name);


--
-- Name: event_types event_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_pkey PRIMARY KEY (type_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (event_id);


--
-- Name: report_reasons report_reasons_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_reasons
    ADD CONSTRAINT report_reasons_name_key UNIQUE (name);


--
-- Name: report_reasons report_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_reasons
    ADD CONSTRAINT report_reasons_pkey PRIMARY KEY (reason_id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (report_id);


--
-- Name: comment_likes unique_user_comment_like; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT unique_user_comment_like UNIQUE (user_id, comment_id);


--
-- Name: user_blocks user_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_pkey PRIMARY KEY (block_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_comments_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_event ON public.comments USING btree (event_id);


--
-- Name: idx_comments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_user ON public.comments USING btree (user_id);


--
-- Name: idx_events_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_active ON public.events USING btree (is_active);


--
-- Name: idx_events_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_archived ON public.events USING btree (is_archived);


--
-- Name: idx_events_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_expires_at ON public.events USING btree (expires_at);


--
-- Name: idx_events_lat_lng; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_lat_lng ON public.events USING btree (latitude, longitude);


--
-- Name: idx_events_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_type_id ON public.events USING btree (type_id);


--
-- Name: idx_reports_comment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_comment ON public.reports USING btree (comment_id);


--
-- Name: idx_reports_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_event ON public.reports USING btree (event_id);


--
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_status ON public.reports USING btree (status);


--
-- Name: idx_user_blocks_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_blocks_active ON public.user_blocks USING btree (is_active);


--
-- Name: idx_users_is_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_blocked ON public.users USING btree (is_blocked);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: comment_likes comment_likes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(comment_id) ON DELETE CASCADE;


--
-- Name: comment_likes comment_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: comments comments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: events events_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.event_types(type_id) ON DELETE RESTRICT;


--
-- Name: events events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: reports reports_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(comment_id);


--
-- Name: reports reports_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id);


--
-- Name: reports reports_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.report_reasons(reason_id) ON DELETE RESTRICT;


--
-- Name: reports reports_reported_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.users(user_id);


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: reports reports_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(user_id);


--
-- Name: user_blocks user_blocks_blocked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES public.users(user_id);


--
-- Name: user_blocks user_blocks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict O32bzWVoyUZwMaMD6MmjupkGUv0fhUtXcQ5pAheWA9K0TI9O7xnmjbhAn4mKWn3

