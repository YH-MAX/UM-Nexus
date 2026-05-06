"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { RequireAuthCard } from "@/components/auth/require-auth-card";
import { useAuth } from "@/components/auth/auth-provider";
import { SafetyNotice } from "@/components/trade/safety-notice";
import { StatusPill } from "@/components/trade/status-pill";
import { TradeShell } from "@/components/trade/trade-shell";
import {
  conditionOptions,
  contactMethods,
  createListing,
  formatCategory,
  formatMoney,
  formatPickupLocation,
  generateSellAgentDraft,
  getCurrentUser,
  getTradeResultStatus,
  getWantedPost,
  isProfileComplete,
  pickupAreas,
  publishSellAgentDraft,
  tradeSafetyMessage,
  tradeCategories,
  uploadListingImage,
  trackProductEvent,
  type CurrentProfile,
  type ListingPayload,
  type SellAgentDraft,
  type SellAgentSellerContext,
} from "@/lib/trade/api";

type PreviewFile = {
  file: File;
  previewUrl: string;
};

type AgentMessage = {
  role: "agent" | "seller";
  body: string;
};

type Clue = {
  label: string;
  field: keyof SellAgentSellerContext;
  prompt: string;
  kind?: "text" | "textarea" | "select";
  options?: readonly { value: string; label: string }[];
};

type PublishPhase =
  | "idle"
  | "creating"
  | "images"
  | "enrichment"
  | "matches"
  | "risk"
  | "ready"
  | "timeout"
  | "failed";

type DraftTab = "decision" | "why" | "confidence";

const sellerGoalOptions = [
  { value: "sell_fast", label: "Sell fast", hint: "Lower price, faster interest" },
  { value: "fair_price", label: "Fair price", hint: "Balanced price and speed" },
  { value: "maximize_revenue", label: "Maximize", hint: "Higher price, slower sale" },
] as const;

const requiredClues: Clue[] = [
  { label: "Product name", field: "product_name", prompt: "What item are you selling?" },
  { label: "Condition", field: "condition_notes", prompt: "What is the condition?", kind: "textarea" },
  {
    label: "Pickup area",
    field: "pickup_area",
    prompt: "Where can the buyer collect it?",
    kind: "select",
    options: pickupAreas,
  },
];

const usefulClues: Clue[] = [
  { label: "Brand/model", field: "brand_model", prompt: "Any brand, model, edition, or size?" },
  { label: "Residential college", field: "residential_college", prompt: "Which college or nearby area?" },
  { label: "Age/usage", field: "age_usage", prompt: "How long has it been used?" },
  { label: "Defects", field: "defects", prompt: "Any scratches, missing parts, or issues?", kind: "textarea" },
  { label: "Accessories", field: "accessories", prompt: "Anything included with the item?", kind: "textarea" },
];

const allClues = [...requiredClues, ...usefulClues];

const clueByMissingField: Record<string, string> = {
  photo: "Upload photo",
  product_name: "Product name",
  condition: "Condition",
  pickup_area: "Pickup area",
};

const priceOptionLabels: Record<SellAgentDraft["price_options"][number]["type"], string> = {
  sell_fast: "Sell fast",
  fair_price: "Fair price",
  maximize_revenue: "Maximize",
};

const publishSteps: Array<{ phase: PublishPhase; label: string }> = [
  { phase: "creating", label: "Create listing" },
  { phase: "images", label: "Attach images" },
  { phase: "enrichment", label: "Run GLM enrichment" },
  { phase: "matches", label: "Find matches" },
  { phase: "risk", label: "Check risk" },
  { phase: "ready", label: "Ready" },
];

const initialListingPayload: ListingPayload = {
  title: "",
  description: "",
  category: "others",
  condition_label: "good",
  price: 0,
  currency: "MYR",
  pickup_location: "kk1",
  pickup_area: "kk1",
  contact_method: "telegram",
  contact_value: "",
};

export default function SellPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const [sellerContext, setSellerContext] = useState<SellAgentSellerContext>({
    seller_goal: "fair_price",
  });
  const [activeClue, setActiveClue] = useState<Clue | null>(null);
  const [activeValue, setActiveValue] = useState("");
  const [freeText, setFreeText] = useState("");
  const [images, setImages] = useState<PreviewFile[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      role: "agent",
      body: "Upload a photo or tell me what you want to sell. I will help draft a fair campus listing.",
    },
  ]);
  const [draft, setDraft] = useState<SellAgentDraft | null>(null);
  const [editableDraft, setEditableDraft] = useState<ListingPayload>(initialListingPayload);
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);
  const [selectedPriceType, setSelectedPriceType] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [publishPhase, setPublishPhase] = useState<PublishPhase>("idle");
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qualityReviewMode, setQualityReviewMode] = useState<"manual" | "ai" | null>(null);

  useEffect(() => {
    return () => {
      images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, [images]);

  useEffect(() => {
    if (!user) {
      setCurrentProfile(null);
      return;
    }
    let isMounted = true;
    void getCurrentUser()
      .then((current) => {
        if (!isMounted) {
          return;
        }
        setCurrentProfile(current.profile);
        const preferredMethod = contactMethods.some((method) => method.value === current.profile.contact_preference)
          ? current.profile.contact_preference
          : null;
        setEditableDraft((existing) => ({
          ...existing,
          contact_method: (preferredMethod as ListingPayload["contact_method"]) ?? existing.contact_method,
          contact_value: current.profile.contact_value ?? existing.contact_value,
        }));
      })
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load your trade profile.");
        }
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    const wantedId = searchParams.get("wanted_id");
    if (!wantedId || !user) {
      return;
    }
    let isMounted = true;
    void getWantedPost(wantedId)
      .then((wantedPost) => {
        if (!isMounted) {
          return;
        }
        setEditableDraft((current) => ({
          ...current,
          title: current.title || `Offer for: ${wantedPost.title}`,
          description:
            current.description ||
            `Created from a UM Nexus wanted request.\n\nBuyer wanted: ${wantedPost.description ?? wantedPost.title}`,
          category: wantedPost.category || current.category,
          item_name: wantedPost.desired_item_name ?? current.item_name,
          price: wantedPost.max_budget ? Math.min(current.price || wantedPost.max_budget, wantedPost.max_budget) : current.price,
          pickup_location: wantedPost.preferred_pickup_area ?? current.pickup_location,
          pickup_area: wantedPost.preferred_pickup_area ?? current.pickup_area,
          residential_college: wantedPost.residential_college ?? current.residential_college,
          source_wanted_post_id: wantedPost.id,
        }));
        setNotice("Wanted request context added. Create the listing manually and publish when ready.");
      })
      .catch((nextError) => {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load wanted request context.");
        }
      });
    return () => {
      isMounted = false;
    };
  }, [searchParams, user]);

  const canGenerate = useMemo(
    () =>
      Boolean(
        sellerContext.product_name ||
          sellerContext.free_text ||
          freeText.trim() ||
          images.length > 0,
      ),
    [freeText, images.length, sellerContext.free_text, sellerContext.product_name],
  );

  const workflowSteps = useMemo(
    () => [
      { label: "Photos", complete: images.length > 0 },
      { label: "Details", complete: hasManualMinimum(editableDraft) },
      { label: "AI optional", complete: Boolean(draft) },
      { label: "Publish", complete: publishPhase === "ready" },
    ],
    [draft, editableDraft, images.length, publishPhase],
  );

  const followUpClues = useMemo(() => {
    const labels = new Set(
      (draft?.missing_fields ?? [])
        .map((field) => clueByMissingField[field] ?? field)
        .filter(Boolean),
    );
    return allClues.filter((clue) => labels.has(clue.label));
  }, [draft?.missing_fields]);

  function updateContext(field: keyof SellAgentSellerContext, value: string) {
    setSellerContext((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function addMessage(message: AgentMessage) {
    setMessages((current) => [...current, message]);
  }

  function handleClueClick(clue: Clue) {
    setActiveClue(clue);
    setActiveValue(clue.field ? String(sellerContext[clue.field] ?? "") : "");
  }

  function saveActiveClue() {
    if (!activeClue) {
      return;
    }
    updateContext(activeClue.field, activeValue);
    addMessage({ role: "seller", body: `${activeClue.label}: ${activeValue || "Not specified"}` });
    addMessage({
      role: "agent",
      body: `Got it. I will use that ${activeClue.label.toLowerCase()} clue in the next draft.`,
    });
    setActiveClue(null);
    setActiveValue("");
  }

  function handleGoalSelect(value: SellAgentSellerContext["seller_goal"]) {
    const option = sellerGoalOptions.find((item) => item.value === value);
    setSellerContext((current) => ({
      ...current,
      seller_goal: value,
    }));
    addMessage({ role: "seller", body: `Selling goal: ${option?.label ?? value}` });
    addMessage({ role: "agent", body: `Understood. I will optimize the price for ${option?.label.toLowerCase() ?? value}.` });
  }

  function handleSendFreeText() {
    const trimmed = freeText.trim();
    if (!trimmed) {
      return;
    }
    setSellerContext((current) => ({
      ...current,
      free_text: [current.free_text, trimmed].filter(Boolean).join("\n"),
    }));
    addMessage({ role: "seller", body: trimmed });
    addMessage({ role: "agent", body: "Noted. I will merge that into the next listing draft and price reasoning." });
    setFreeText("");
  }

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) {
      return;
    }
    const availableSlots = Math.max(0, 5 - images.length);
    const filesToAdd = selectedFiles.slice(0, availableSlots);
    if (filesToAdd.length === 0) {
      setError("You can upload up to 5 photos.");
      event.target.value = "";
      return;
    }

    setImages((current) => [
      ...current,
      ...filesToAdd.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
    setError(null);
    addMessage({ role: "seller", body: `Added ${filesToAdd.length} photo(s).` });
    addMessage({ role: "agent", body: "Great. I can use public image URLs for item, condition, and trust reasoning." });
    event.target.value = "";
  }

  function removeImage(previewUrl: string) {
    setImages((current) => {
      const target = current.find((image) => image.previewUrl === previewUrl);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((image) => image.previewUrl !== previewUrl);
    });
  }

  async function handleGenerateDraft() {
    setIsGenerating(true);
    setError(null);
    addMessage({ role: "agent", body: "Analyzing photos, campus demand, and price comparables..." });
    try {
      const contextForDraft: SellAgentSellerContext = {
        ...sellerContext,
        free_text: [sellerContext.free_text, freeText.trim()].filter(Boolean).join("\n") || undefined,
      };
      const nextDraft = await generateSellAgentDraft(
        contextForDraft,
        images.map((image) => image.file),
      );
      setSellerContext(contextForDraft);
      setFreeText("");
      setDraft(nextDraft);
      setEditableDraft({
        ...nextDraft.listing_payload,
        condition_label: nextDraft.listing_payload.condition_label ?? "good",
        contact_method: nextDraft.listing_payload.contact_method ?? "telegram",
      });
      setSelectedPriceType("fair_price");
      addMessage({ role: "agent", body: nextDraft.assistant_message });
      if (nextDraft.missing_fields.length > 0) {
        addMessage({ role: "agent", body: `A few clues would improve confidence: ${nextDraft.missing_fields.join(", ")}.` });
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to generate AI draft.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handlePublish() {
    if (!draft) {
      return;
    }
    const validationError = validateManualListing(editableDraft, currentProfile);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!isContactReady(editableDraft)) {
      setError("Choose a contact method. Telegram and WhatsApp need a contact value before publishing.");
      return;
    }
    setIsPublishing(true);
    setError(null);
    setPublishPhase("creating");
    try {
      const response = await publishSellAgentDraft({
        draft_id: draft.draft_id,
        listing_payload: editableDraft,
        uploaded_images: draft.uploaded_images,
      });
      setPublishedListingId(response.listing.id);
      void trackProductEvent({
        event_type: "listing_published",
        entity_type: "listing",
        entity_id: response.listing.id,
        metadata: { source: "ai_seller_assistant" },
      });
      setPublishPhase("images");
      await sleep(250);
      setPublishPhase("enrichment");

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const status = await getTradeResultStatus(response.listing.id);
        if (status.status === "completed") {
          setPublishPhase("matches");
          await sleep(250);
          setPublishPhase("risk");
          await sleep(250);
          setPublishPhase("ready");
          await sleep(650);
          router.push(`/trade/${response.listing.id}`);
          return;
        }
        if (status.status === "failed") {
          setPublishPhase("failed");
          setError(status.error_message ?? "The listing was published, but AI enrichment failed.");
          return;
        }
        await sleep(1000);
      }
      setPublishPhase("timeout");
    } catch (nextError) {
      setPublishPhase("failed");
      setError(nextError instanceof Error ? nextError.message : "Unable to publish listing.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleSaveManualDraft() {
    setIsSavingDraft(true);
    setError(null);
    setNotice(null);
    try {
      const listing = await createListing(prepareListingPayload(editableDraft), { publish: false });
      await uploadSelectedImages(listing.id);
      setPublishedListingId(listing.id);
      setNotice("Draft saved. You can finish it from your dashboard.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save draft.");
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handlePublishManual() {
    const validationError = validateManualListing(editableDraft, currentProfile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsPublishing(true);
    setError(null);
    setNotice(null);
    setPublishPhase("creating");
    try {
      const listing = await createListing(prepareListingPayload(editableDraft), { publish: true });
      setPublishedListingId(listing.id);
      void trackProductEvent({
        event_type: "listing_published",
        entity_type: "listing",
        entity_id: listing.id,
        metadata: { source: "manual_sell_page" },
      });
      setPublishPhase("images");
      await uploadSelectedImages(listing.id);
      setPublishPhase("risk");
      await sleep(250);
      setPublishPhase("ready");
      router.push(`/trade/${listing.id}`);
    } catch (nextError) {
      setPublishPhase("failed");
      setError(nextError instanceof Error ? nextError.message : "Unable to publish listing.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function uploadSelectedImages(listingId: string) {
    for (const [index, image] of images.entries()) {
      await uploadListingImage(listingId, image.file, {
        sortOrder: index,
        isPrimary: index === 0,
      });
    }
  }

  function updateDraftField(field: keyof ListingPayload, value: string | number | undefined) {
    setEditableDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function applyPriceOption(option: SellAgentDraft["price_options"][number]) {
    updateDraftField("price", option.price);
    setSelectedPriceType(option.type);
    addMessage({ role: "seller", body: `Selected ${priceOptionLabels[option.type]} at ${formatMoney(option.price)}.` });
    addMessage({ role: "agent", body: option.tradeoff_summary });
  }

  const profileReady = isProfileComplete(currentProfile);
  const isBusy = isGenerating || isPublishing || isSavingDraft;

  return (
    <TradeShell
      title="Sell an item"
      description="Create a campus listing manually first. AI is optional help for title, category, description, and fair price guidance."
    >
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}

      {qualityReviewMode ? (
        <PublishQualityCheckpoint
          imageCount={images.length}
          payload={editableDraft}
          onClose={() => setQualityReviewMode(null)}
          onImprove={() => setQualityReviewMode(null)}
          onPublishAnyway={() => {
            const mode = qualityReviewMode;
            setQualityReviewMode(null);
            if (mode === "ai") {
              void handlePublish();
            } else {
              void handlePublishManual();
            }
          }}
          onSaveDraft={() => {
            setQualityReviewMode(null);
            void handleSaveManualDraft();
          }}
        />
      ) : null}

      {!user ? (
        <RequireAuthCard description="Sign in with your UM account before creating seller listings." intent="sell_item" returnTo="/trade/sell" />
      ) : null}

      {user ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div className="grid gap-5">
            <WorkflowProgress steps={workflowSteps} />

            {!profileReady ? <ProfileRequiredPanel /> : null}

            <PhotoUploadPanel
              cameraInputRef={cameraInputRef}
              disabled={isBusy}
              fileInputRef={fileInputRef}
              images={images}
              onFileChange={handleImageSelection}
              onRemoveImage={removeImage}
            />

            <ManualListingPanel
              disabled={isBusy}
              draft={editableDraft}
              imageCount={images.length}
              isPublishing={isPublishing}
              isSavingDraft={isSavingDraft}
              onPublish={() => setQualityReviewMode("manual")}
              onSaveDraft={handleSaveManualDraft}
              onUpdateDraftField={updateDraftField}
            />

            <AgentConversationPanel
              activeClue={activeClue}
              activeValue={activeValue}
              canGenerate={canGenerate}
              className="order-3 lg:col-start-1 lg:row-start-2"
              disabled={isBusy}
              draft={draft}
              error={error}
              followUpClues={followUpClues}
              freeText={freeText}
              imagesCount={images.length}
              isGenerating={isGenerating}
              messages={messages}
              onCancelClue={() => setActiveClue(null)}
              onClueClick={handleClueClick}
              onGenerateDraft={handleGenerateDraft}
              onGoalSelect={handleGoalSelect}
              onSaveClue={saveActiveClue}
              onSendFreeText={handleSendFreeText}
              sellerContext={sellerContext}
              setActiveValue={setActiveValue}
              setFreeText={setFreeText}
            />
          </div>

          <aside className="grid gap-5 lg:sticky lg:top-24">
            <ListingPreviewPanel draft={editableDraft} images={images} />
            <SafetyNotice />
            <DraftReviewPanel
              draft={draft}
              editableDraft={editableDraft}
              isGenerating={isGenerating}
              isPublishing={isPublishing}
              onApplyPriceOption={applyPriceOption}
              onGenerateDraft={handleGenerateDraft}
              onOpenListing={() => (publishedListingId ? router.push(`/trade/${publishedListingId}`) : undefined)}
              onPublish={() => setQualityReviewMode("ai")}
              onUpdateDraftField={updateDraftField}
              publishPhase={publishPhase}
              publishedListingId={publishedListingId}
              selectedPriceType={selectedPriceType}
            />
          </aside>
        </div>
      ) : null}
    </TradeShell>
  );
}

function ProfileRequiredPanel() {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-amber-950">Complete your trade profile</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Display name, faculty, and campus location are required before publishing.
          </p>
        </div>
        <Link
          className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          href="/trade/profile"
        >
          Edit profile
        </Link>
      </div>
    </section>
  );
}

function PublishQualityCheckpoint({
  imageCount,
  payload,
  onClose,
  onImprove,
  onPublishAnyway,
  onSaveDraft,
}: Readonly<{
  imageCount: number;
  payload: ListingPayload;
  onClose: () => void;
  onImprove: () => void;
  onPublishAnyway: () => void;
  onSaveDraft: () => void;
}>) {
  const prepared = prepareListingPayload(payload);
  const checks = [
    { label: "Title added", ok: prepared.title.trim().length >= 5 },
    { label: "Price added", ok: prepared.category === "free_items" || prepared.price >= 0 },
    { label: "Pickup location selected", ok: Boolean(prepared.pickup_location) },
    { label: "Contact method added", ok: isContactReady(prepared) },
    { label: "Description has enough detail", ok: Boolean(prepared.description && prepared.description.length >= 40) },
    { label: "At least one photo added", ok: imageCount > 0 },
  ];

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-amber-950">Ready to publish?</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Review the listing quality checkpoint before it goes live. Warnings help quality but do not block publishing.
          </p>
        </div>
        <button className="trade-button-secondary bg-white" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {checks.map((check) => (
          <div
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
              check.ok ? "border-emerald-200 bg-white text-emerald-800" : "border-amber-300 bg-white text-amber-900"
            }`}
            key={check.label}
          >
            {check.ok ? "OK" : "Needs attention"}: {check.label}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="trade-button-secondary bg-white" onClick={onSaveDraft} type="button">
          Save Draft
        </button>
        <button className="trade-button-secondary bg-white" onClick={onImprove} type="button">
          Improve Listing
        </button>
        <button className="trade-button-primary" onClick={onPublishAnyway} type="button">
          Publish Anyway
        </button>
      </div>
    </section>
  );
}

function ListingPreviewPanel({
  draft,
  images,
}: Readonly<{
  draft: ListingPayload;
  images: PreviewFile[];
}>) {
  const cover = images[0];
  const condition = draft.condition_label ?? draft.condition ?? "good";
  const pickup = draft.pickup_location ?? draft.pickup_area ?? "kk1";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-slate-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="Listing preview" className="h-full w-full object-cover" src={cover.previewUrl} />
        ) : (
          <div className="px-6 text-center text-sm font-semibold text-slate-500">
            Your first photo becomes the cover image.
          </div>
        )}
        <div className="absolute left-3 top-3">
          <StatusPill tone="available">Preview</StatusPill>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Live listing preview</p>
          <h2 className="mt-2 line-clamp-2 text-lg font-semibold text-slate-950">
            {draft.title.trim() || "Item title"}
          </h2>
          <p className="mt-2 text-2xl font-bold text-emerald-800">
            {formatMoney(draft.category === "free_items" ? 0 : draft.price, draft.currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-medium text-slate-800">
            {formatCategory(draft.category || "others")} · {condition.replaceAll("_", " ")}
          </p>
          <p className="mt-1">Pickup: {formatPickupLocation(pickup)}</p>
        </div>
        <p className="line-clamp-3 text-sm leading-6 text-slate-600">
          {draft.description?.trim() || "Write a short, honest description so buyers can decide quickly."}
        </p>
      </div>
    </section>
  );
}

function ManualListingPanel({
  disabled,
  draft,
  imageCount,
  isPublishing,
  isSavingDraft,
  onPublish,
  onSaveDraft,
  onUpdateDraftField,
}: Readonly<{
  disabled: boolean;
  draft: ListingPayload;
  imageCount: number;
  isPublishing: boolean;
  isSavingDraft: boolean;
  onPublish: () => void;
  onSaveDraft: () => void;
  onUpdateDraftField: (field: keyof ListingPayload, value: string | number | undefined) => void;
}>) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Manual listing</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Product details</h2>
        </div>
        <StatusPill tone={imageCount > 0 ? "good" : "warn"}>{imageCount}/5 photos</StatusPill>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <EditableField
          label="Title"
          value={draft.title}
          onChange={(value) => onUpdateDraftField("title", value)}
        />
        <EditableNumber
          label="Price"
          value={draft.price}
          onChange={(value) => onUpdateDraftField("price", value)}
        />
        <EditableSelect
          label="Category"
          options={tradeCategories}
          value={draft.category}
          onChange={(value) => {
            onUpdateDraftField("category", value);
            if (value === "free_items") {
              onUpdateDraftField("price", 0);
            }
          }}
        />
        <EditableSelect
          label="Condition"
          options={conditionOptions}
          value={draft.condition_label ?? "good"}
          onChange={(value) => onUpdateDraftField("condition_label", value)}
        />
        <EditableSelect
          label="Pickup location"
          options={pickupAreas}
          value={draft.pickup_location ?? draft.pickup_area ?? "kk1"}
          onChange={(value) => {
            onUpdateDraftField("pickup_location", value);
            onUpdateDraftField("pickup_area", value);
          }}
        />
        <EditableField
          label="Pickup note"
          value={draft.pickup_note ?? ""}
          onChange={(value) => onUpdateDraftField("pickup_note", value || undefined)}
        />
        <label className="grid gap-2 lg:col-span-2">
          <span className="text-sm font-semibold text-slate-800">Description</span>
          <textarea
            className="min-h-28 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-600"
            value={draft.description ?? ""}
            onChange={(event) => onUpdateDraftField("description", event.target.value || undefined)}
          />
        </label>
        <EditableSelect
          label="Contact method"
          options={contactMethods}
          value={draft.contact_method ?? "telegram"}
          onChange={(value) => onUpdateDraftField("contact_method", value)}
        />
        <EditableField
          label="Contact value"
          value={draft.contact_value ?? ""}
          onChange={(value) => onUpdateDraftField("contact_value", value || undefined)}
        />
      </div>

      <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">Extra item fields</summary>
        <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-3">
          <EditableField
            label="Item name"
            value={draft.item_name ?? ""}
            onChange={(value) => onUpdateDraftField("item_name", value || undefined)}
          />
          <EditableField
            label="Brand"
            value={draft.brand ?? ""}
            onChange={(value) => onUpdateDraftField("brand", value || undefined)}
          />
          <EditableField
            label="Model"
            value={draft.model ?? ""}
            onChange={(value) => onUpdateDraftField("model", value || undefined)}
          />
        </div>
      </details>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="trade-button-secondary"
          disabled={disabled || isSavingDraft}
          onClick={onSaveDraft}
          type="button"
        >
          {isSavingDraft ? "Saving..." : "Save Draft"}
        </button>
        <button
          className="trade-button-primary"
          disabled={disabled || isPublishing}
          onClick={onPublish}
          type="button"
        >
          {isPublishing ? "Publishing..." : "Publish Listing"}
        </button>
      </div>
    </section>
  );
}

function WorkflowProgress({
  steps,
}: Readonly<{
  steps: Array<{ label: string; complete: boolean }>;
}>) {
  const firstIncomplete = steps.findIndex((step) => !step.complete);
  const activeIndex = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-4">
        {steps.map((step, index) => {
          const isDone = step.complete;
          const isActive = activeIndex === index && !isDone;
          return (
            <div
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                isDone ? "bg-emerald-50" : isActive ? "bg-slate-100" : "bg-white"
              }`}
              key={step.label}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                  isDone
                    ? "bg-emerald-700 text-white"
                    : isActive
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{step.label}</p>
                <p className="text-xs text-slate-500">{isDone ? "Complete" : isActive ? "Current" : "Next"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PhotoUploadPanel({
  cameraInputRef,
  className,
  disabled,
  fileInputRef,
  images,
  onFileChange,
  onRemoveImage,
}: Readonly<{
  cameraInputRef: React.RefObject<HTMLInputElement>;
  className?: string;
  disabled: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  images: PreviewFile[];
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (previewUrl: string) => void;
}>) {
  const slots = Array.from({ length: 5 }, (_, index) => images[index] ?? null);

  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className ?? ""}`}>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
        multiple
        onChange={onFileChange}
        ref={fileInputRef}
        type="file"
      />
      <input
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={onFileChange}
        ref={cameraInputRef}
        type="file"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">1 Photos</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Start with the item</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Clear photos help the AI estimate item type, condition, and risk.
          </p>
        </div>
        <StatusPill tone={images.length > 0 ? "good" : "neutral"}>{images.length}/5 photos</StatusPill>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {slots.map((image, index) =>
          image ? (
            <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100" key={image.previewUrl}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`Upload preview ${index + 1}`}
                className="aspect-square w-full object-cover"
                src={image.previewUrl}
              />
              {index === 0 ? (
                <span className="absolute left-2 top-2 rounded-lg bg-slate-950/90 px-2 py-1 text-xs font-semibold text-white">
                  Primary
                </span>
              ) : null}
              <button
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-slate-700 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
                disabled={disabled}
                onClick={() => onRemoveImage(image.previewUrl)}
                type="button"
              >
                <CloseIcon />
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 px-2 py-1 text-xs text-white">
                <p className="truncate">{image.file.name}</p>
              </div>
            </div>
          ) : (
            <button
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-sm font-semibold text-slate-600 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled}
              key={`slot-${index}`}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <UploadIcon />
              <span>{index === 0 ? "Add photo" : "Optional"}</span>
            </button>
          ),
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={disabled || images.length >= 5}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <UploadIcon />
          Upload photos
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-emerald-500 hover:text-emerald-800 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={disabled || images.length >= 5}
          onClick={() => cameraInputRef.current?.click()}
          type="button"
        >
          <CameraIcon />
          Use camera
        </button>
      </div>
    </section>
  );
}

function AgentConversationPanel({
  activeClue,
  activeValue,
  canGenerate,
  className,
  disabled,
  draft,
  error,
  followUpClues,
  freeText,
  imagesCount,
  isGenerating,
  messages,
  onCancelClue,
  onClueClick,
  onGenerateDraft,
  onGoalSelect,
  onSaveClue,
  onSendFreeText,
  sellerContext,
  setActiveValue,
  setFreeText,
}: Readonly<{
  activeClue: Clue | null;
  activeValue: string;
  canGenerate: boolean;
  className?: string;
  disabled: boolean;
  draft: SellAgentDraft | null;
  error: string | null;
  followUpClues: Clue[];
  freeText: string;
  imagesCount: number;
  isGenerating: boolean;
  messages: AgentMessage[];
  onCancelClue: () => void;
  onClueClick: (clue: Clue) => void;
  onGenerateDraft: () => void;
  onGoalSelect: (value: SellAgentSellerContext["seller_goal"]) => void;
  onSaveClue: () => void;
  onSendFreeText: () => void;
  sellerContext: SellAgentSellerContext;
  setActiveValue: Dispatch<SetStateAction<string>>;
  setFreeText: Dispatch<SetStateAction<string>>;
}>) {
  return (
    <section className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${className ?? ""}`}>
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">2 Seller clues</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">AI listing assistant</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={imagesCount > 0 ? "good" : "neutral"}>{imagesCount}/5 photos</StatusPill>
            {draft ? (
              <StatusPill tone={draft.metadata.used_fallback ? "warn" : "good"}>
                {draft.metadata.used_fallback ? "fallback" : draft.metadata.analysis_mode}
              </StatusPill>
            ) : (
              <StatusPill>ready</StatusPill>
            )}
          </div>
        </div>
      </div>

      <div className="h-[320px] space-y-3 overflow-y-auto bg-slate-50 p-4">
        {messages.map((message, index) => (
          <div
            className={`flex ${message.role === "seller" ? "justify-end" : "justify-start"}`}
            key={`${message.role}-${index}`}
          >
            <div
              className={`max-w-[88%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
                message.role === "agent"
                  ? "border border-slate-200 bg-white text-slate-800"
                  : "bg-slate-950 text-white"
              }`}
            >
              {message.body}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 border-t border-slate-200 p-5">
        {followUpClues.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-amber-950">Add these to improve confidence</p>
              <div className="flex flex-wrap gap-2">
                {followUpClues.map((clue) => (
                  <button
                    className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-amber-900 ring-1 ring-amber-300 transition hover:bg-amber-100 disabled:opacity-60"
                    disabled={disabled}
                    key={clue.label}
                    onClick={() => onClueClick(clue)}
                    type="button"
                  >
                    {clue.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <ClueGroup disabled={disabled} label="Required" clues={requiredClues} onClueClick={onClueClick} />
        <ClueGroup disabled={disabled} label="Useful details" clues={usefulClues} onClueClick={onClueClick} />

        <div>
          <p className="text-sm font-semibold text-slate-800">Goal</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {sellerGoalOptions.map((option) => {
              const isSelected = sellerContext.seller_goal === option.value;
              return (
                <button
                  className={`rounded-lg border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                  }`}
                  disabled={disabled}
                  key={option.value}
                  onClick={() => onGoalSelect(option.value)}
                  type="button"
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeClue ? (
          <ClueInputPanel
            activeClue={activeClue}
            activeValue={activeValue}
            disabled={disabled}
            onCancel={onCancelClue}
            onSave={onSaveClue}
            setActiveValue={setActiveValue}
          />
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="sr-only" htmlFor="seller-message">
            Message the sell agent
          </label>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <textarea
              className="min-h-20 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={disabled}
              id="seller-message"
              placeholder="Tell the agent anything useful: bought last semester, minor scratches, includes charger, need to sell before move-out."
              value={freeText}
              onChange={(event) => setFreeText(event.target.value)}
            />
            <button
              aria-label="Send message"
              className="inline-flex h-full min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-emerald-500 hover:text-emerald-800 disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={disabled || !freeText.trim()}
              onClick={onSendFreeText}
              type="button"
            >
              <SendIcon />
            </button>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            {error}
          </p>
        ) : null}

        <button
          className="w-full rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={disabled || !canGenerate || isGenerating}
          onClick={onGenerateDraft}
          type="button"
        >
          {isGenerating ? "Generating AI draft..." : draft ? "Regenerate AI draft" : "Generate AI draft"}
        </button>
      </div>
    </section>
  );
}

function ClueGroup({
  clues,
  disabled,
  label,
  onClueClick,
}: Readonly<{
  clues: Clue[];
  disabled: boolean;
  label: string;
  onClueClick: (clue: Clue) => void;
}>) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {clues.map((clue) => (
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-800 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={disabled}
            key={clue.label}
            onClick={() => onClueClick(clue)}
            type="button"
          >
            {clue.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ClueInputPanel({
  activeClue,
  activeValue,
  disabled,
  onCancel,
  onSave,
  setActiveValue,
}: Readonly<{
  activeClue: Clue;
  activeValue: string;
  disabled: boolean;
  onCancel: () => void;
  onSave: () => void;
  setActiveValue: Dispatch<SetStateAction<string>>;
}>) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3">
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-emerald-950">{activeClue.prompt}</span>
        {activeClue.kind === "select" ? (
          <select
            className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
            disabled={disabled}
            value={activeValue}
            onChange={(event) => setActiveValue(event.target.value)}
          >
            <option value="">Choose one</option>
            {activeClue.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : activeClue.kind === "textarea" ? (
          <textarea
            className="min-h-20 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
            disabled={disabled}
            value={activeValue}
            onChange={(event) => setActiveValue(event.target.value)}
          />
        ) : (
          <input
            className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-700"
            disabled={disabled}
            value={activeValue}
            onChange={(event) => setActiveValue(event.target.value)}
          />
        )}
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={disabled}
          onClick={onSave}
          type="button"
        >
          Add clue
        </button>
        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={disabled}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function DraftReviewPanel({
  className,
  draft,
  editableDraft,
  isGenerating,
  isPublishing,
  onApplyPriceOption,
  onGenerateDraft,
  onOpenListing,
  onPublish,
  onUpdateDraftField,
  publishPhase,
  publishedListingId,
  selectedPriceType,
}: Readonly<{
  className?: string;
  draft: SellAgentDraft | null;
  editableDraft: ListingPayload | null;
  isGenerating: boolean;
  isPublishing: boolean;
  onApplyPriceOption: (option: SellAgentDraft["price_options"][number]) => void;
  onGenerateDraft: () => void;
  onOpenListing: () => void;
  onPublish: () => void;
  onUpdateDraftField: (field: keyof ListingPayload, value: string | number | undefined) => void;
  publishPhase: PublishPhase;
  publishedListingId: string | null;
  selectedPriceType: string | null;
}>) {
  const [activeTab, setActiveTab] = useState<DraftTab>("decision");

  return (
    <aside className={`h-fit rounded-lg border border-slate-200 bg-white shadow-sm lg:sticky lg:top-6 ${className ?? ""}`}>
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">3 AI draft</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Review before publishing</h2>
          </div>
          {draft ? <StatusPill tone="good">seller-approved</StatusPill> : null}
        </div>
      </div>

      {!draft || !editableDraft ? (
        <DraftEmptyState isGenerating={isGenerating} />
      ) : (
        <div className="space-y-5 p-5">
          <ProviderNotice draft={draft} disabled={isGenerating || isPublishing} onRetry={onGenerateDraft} />

          <DecisionSnapshot draft={draft} />

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-950">Listing draft</h3>
              <StatusPill tone={draft.metadata.image_analysis_skipped ? "warn" : "good"}>
                {draft.metadata.image_analysis_skipped ? "text-only" : "multimodal"}
              </StatusPill>
            </div>

            <EditableField
              label="Title"
              value={editableDraft.title}
              onChange={(value) => onUpdateDraftField("title", value)}
            />
            <EditableNumber
              label="Current chosen price"
              value={editableDraft.price}
              onChange={(value) => onUpdateDraftField("price", value)}
            />
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-800">Description</span>
              <textarea
                className="min-h-28 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-600"
                value={editableDraft.description ?? ""}
                onChange={(event) => onUpdateDraftField("description", event.target.value || undefined)}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <EditableSelect
                label="Condition"
                options={conditionOptions}
                value={editableDraft.condition_label ?? "good"}
                onChange={(value) => onUpdateDraftField("condition_label", value)}
              />
              <EditableSelect
                allowEmpty
                label="Pickup area"
                options={pickupAreas}
                value={editableDraft.pickup_area ?? ""}
                onChange={(value) => onUpdateDraftField("pickup_area", value || undefined)}
              />
            </div>

            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
              <h3 className="text-sm font-semibold text-cyan-950">Contact request setup</h3>
              <p className="mt-1 text-sm leading-6 text-cyan-900">
                Your contact stays hidden until you accept a buyer request.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <EditableSelect
                  label="Contact method"
                  options={contactMethods}
                  value={editableDraft.contact_method ?? "telegram"}
                  onChange={(value) => onUpdateDraftField("contact_method", value)}
                />
                <EditableField
                  label="Contact value"
                  value={editableDraft.contact_value ?? ""}
                  onChange={(value) => onUpdateDraftField("contact_value", value || undefined)}
                />
              </div>
            </div>

            <details className="rounded-lg border border-slate-200 bg-slate-50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
                Edit details
              </summary>
              <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2">
                <EditableSelect
                  label="Category"
                  options={tradeCategories}
                  value={editableDraft.category}
                  onChange={(value) => onUpdateDraftField("category", value)}
                />
                <EditableField
                  label="Item name"
                  value={editableDraft.item_name ?? ""}
                  onChange={(value) => onUpdateDraftField("item_name", value || undefined)}
                />
                <EditableField
                  label="Brand"
                  value={editableDraft.brand ?? ""}
                  onChange={(value) => onUpdateDraftField("brand", value || undefined)}
                />
                <EditableField
                  label="Model"
                  value={editableDraft.model ?? ""}
                  onChange={(value) => onUpdateDraftField("model", value || undefined)}
                />
                <EditableField
                  label="Residential college"
                  value={editableDraft.residential_college ?? ""}
                  onChange={(value) => onUpdateDraftField("residential_college", value || undefined)}
                />
              </div>
            </details>
          </section>

          <PriceTradeoffSelector
            options={draft.price_options}
            selectedPriceType={selectedPriceType}
            onApplyPriceOption={onApplyPriceOption}
          />

          <DraftInsightTabs activeTab={activeTab} draft={draft} setActiveTab={setActiveTab} />

          {publishPhase !== "idle" ? (
            <PublishProgress phase={publishPhase} listingId={publishedListingId} onOpenListing={onOpenListing} />
          ) : null}

          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            {tradeSafetyMessage}
          </p>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-950">AI-generated, seller-approved</p>
                <p className="mt-1 text-sm text-emerald-900">
                  Publishing at {formatMoney(editableDraft.price)} with {draft.pricing.risk_level} risk.
                </p>
              </div>
              <StatusPill tone={riskTone(draft.pricing.risk_level)}>{draft.pricing.risk_level}</StatusPill>
            </div>
            <button
              className="mt-4 w-full rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isPublishing || publishPhase === "ready" || !isContactReady(editableDraft)}
              onClick={onPublish}
              type="button"
            >
              {isPublishing ? "Publishing..." : "Publish listing"}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function DraftEmptyState({ isGenerating }: Readonly<{ isGenerating: boolean }>) {
  if (isGenerating) {
    return (
      <div className="space-y-4 p-5">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950">
          Analyzing photos, campus demand, and price comparables...
        </div>
        <SkeletonBlock height="h-20" />
        <div className="grid gap-3 sm:grid-cols-3">
          <SkeletonBlock height="h-24" />
          <SkeletonBlock height="h-24" />
          <SkeletonBlock height="h-24" />
        </div>
        <SkeletonBlock height="h-36" />
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
        <p className="text-sm font-semibold text-slate-950">Your AI draft will appear here.</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Add a photo or seller clue, then generate a draft with price guidance, risk level, and next action.
        </p>
      </div>
    </div>
  );
}

function ProviderNotice({
  disabled,
  draft,
  onRetry,
}: Readonly<{
  disabled: boolean;
  draft: SellAgentDraft;
  onRetry: () => void;
}>) {
  const isFallback = draft.metadata.used_fallback;
  const isTextOnly = draft.metadata.image_analysis_skipped;

  if (!isFallback && !isTextOnly) {
    return (
      <div className="flex flex-wrap gap-2">
        <StatusPill tone={draft.metadata.provider === "zai" ? "good" : "warn"}>{draft.metadata.provider}</StatusPill>
        <StatusPill tone="good">multimodal</StatusPill>
        <StatusPill>{draft.metadata.model ?? "model pending"}</StatusPill>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-amber-950">
          {isFallback ? "GLM unavailable. Fallback draft shown." : "Image analysis skipped. Text-only draft shown."}
        </p>
        <button
          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={disabled}
          onClick={onRetry}
          type="button"
        >
          Retry AI draft
        </button>
      </div>
    </div>
  );
}

function DecisionSnapshot({ draft }: Readonly<{ draft: SellAgentDraft }>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Metric label="Suggested" value={formatMoney(draft.pricing.suggested_listing_price)} />
      <Metric label="Minimum" value={formatMoney(draft.pricing.minimum_acceptable_price)} />
      <Metric label="Risk" value={draft.pricing.risk_level} tone={riskTone(draft.pricing.risk_level)} />
      <Metric label="Expected" value={draft.expected_outcome.expected_time_to_sell} />
    </div>
  );
}

function PriceTradeoffSelector({
  options,
  selectedPriceType,
  onApplyPriceOption,
}: Readonly<{
  options: SellAgentDraft["price_options"];
  selectedPriceType: string | null;
  onApplyPriceOption: (option: SellAgentDraft["price_options"][number]) => void;
}>) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-950">Price trade-off</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const isSelected = selectedPriceType === option.type;
          return (
            <button
              className={`rounded-lg border px-3 py-3 text-left transition ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
              }`}
              key={option.type}
              onClick={() => onApplyPriceOption(option)}
              type="button"
            >
              <span className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                {priceOptionLabels[option.type]}
              </span>
              <span className="mt-2 block text-lg font-semibold text-slate-950">{formatMoney(option.price)}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-600">{option.expected_time_to_sell}</span>
              <span className="mt-2 block text-xs leading-5 text-slate-600">{option.tradeoff_summary}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DraftInsightTabs({
  activeTab,
  draft,
  setActiveTab,
}: Readonly<{
  activeTab: DraftTab;
  draft: SellAgentDraft;
  setActiveTab: Dispatch<SetStateAction<DraftTab>>;
}>) {
  const tabs: Array<{ id: DraftTab; label: string }> = [
    { id: "decision", label: "Decision" },
    { id: "why", label: "Why" },
    { id: "confidence", label: "Confidence" },
  ];

  return (
    <section className="rounded-lg border border-slate-200">
      <div className="grid grid-cols-3 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            className={`px-3 py-3 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {activeTab === "decision" ? (
          <div className="space-y-3">
            <Reason title={draft.action.action_type.replaceAll("_", " ")} body={draft.action.action_reason} />
            <Reason
              title="Expected outcome"
              body={`${draft.expected_outcome.expected_time_to_sell}; ${draft.expected_outcome.expected_buyer_interest}.`}
            />
            {draft.missing_fields.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Missing confidence clues: {draft.missing_fields.join(", ")}
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "why" ? (
          <div className="space-y-3">
            <Reason title="Similar items" body={draft.why.similar_item_pattern} />
            <Reason title="Condition" body={draft.why.condition_estimate} />
            <Reason title="Demand" body={draft.why.local_demand_context} />
            <Reason title="Price" body={draft.why.price_competitiveness} />
          </div>
        ) : null}

        {activeTab === "confidence" ? (
          <div className="space-y-3">
            {Object.entries(draft.confidence_breakdown).map(([key, item]) => (
              <ConfidenceRow
                key={key}
                label={key.replaceAll("_", " ")}
                level={item.level}
                reason={item.reason}
              />
            ))}
            <details className="rounded-lg border border-slate-200 bg-slate-50">
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-800">
                Field explanations
              </summary>
              <div className="space-y-3 border-t border-slate-200 p-3">
                {Object.entries(draft.field_explanations).map(([field, explanation]) => (
                  <Reason key={field} title={field} body={explanation} />
                ))}
              </div>
            </details>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EditableField({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <input
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function EditableNumber({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: number;
  onChange: (value: number) => void;
}>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <input
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600"
        min="0"
        step="0.01"
        type="number"
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function EditableSelect({
  allowEmpty = false,
  label,
  value,
  options,
  onChange,
}: Readonly<{
  allowEmpty?: boolean;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <select
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {allowEmpty ? <option value="">Not specified</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({
  label,
  tone,
  value,
}: Readonly<{
  label: string;
  tone?: "neutral" | "good" | "warn" | "danger";
  value: string;
}>) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50"
        : tone === "good"
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50";

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ConfidenceRow({
  label,
  level,
  reason,
}: Readonly<{
  label: string;
  level: "low" | "medium" | "high";
  reason: string;
}>) {
  const percent = level === "high" ? "w-full" : level === "medium" ? "w-2/3" : "w-1/3";
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold capitalize text-slate-950">{label}</p>
        <StatusPill tone={level === "high" ? "good" : level === "medium" ? "warn" : "danger"}>{level}</StatusPill>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-lg bg-slate-100">
        <div className={`h-full rounded-lg bg-emerald-600 ${percent}`} />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{reason}</p>
    </div>
  );
}

function Reason({ title, body }: Readonly<{ title: string; body: string }>) {
  return (
    <div className="border-l-4 border-slate-200 pl-3">
      <h4 className="text-sm font-semibold capitalize text-slate-950">{title}</h4>
      <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function PublishProgress({
  phase,
  listingId,
  onOpenListing,
}: Readonly<{
  phase: PublishPhase;
  listingId: string | null;
  onOpenListing: () => void;
}>) {
  const activeIndex = publishSteps.findIndex((step) => step.phase === phase);
  const normalizedIndex = activeIndex >= 0 ? activeIndex : phase === "timeout" ? 2 : 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-950">Publish progress</p>
      <div className="mt-3 grid gap-2">
        {publishSteps.map((step, index) => {
          const isDone = index < normalizedIndex || phase === "ready";
          const isActive = step.phase === phase;
          return (
            <div className="grid grid-cols-[24px_1fr] items-center gap-3 text-sm" key={step.phase}>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-semibold ${
                  isDone || isActive ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                {index + 1}
              </span>
              <span className={isDone || isActive ? "font-semibold text-slate-950" : "text-slate-500"}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      {phase === "timeout" ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          The listing is published and AI enrichment is still running.
          {listingId ? (
            <button
              className="ml-2 font-semibold underline"
              onClick={onOpenListing}
              type="button"
            >
              Open listing while analysis continues
            </button>
          ) : null}
        </div>
      ) : null}
      {phase === "failed" ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          The listing was created, but one AI step failed. You can retry enrichment from the listing page.
        </p>
      ) : null}
    </div>
  );
}

function SkeletonBlock({ height }: Readonly<{ height: string }>) {
  return <div className={`${height} animate-pulse rounded-lg bg-slate-100`} />;
}

function riskTone(level: "low" | "medium" | "high") {
  if (level === "high") {
    return "danger" as const;
  }
  if (level === "medium") {
    return "warn" as const;
  }
  return "good" as const;
}

function hasManualMinimum(payload: ListingPayload): boolean {
  return Boolean(payload.title.trim() && payload.description?.trim() && payload.category && payload.condition_label);
}

function prepareListingPayload(payload: ListingPayload): ListingPayload {
  const pickupLocation = payload.pickup_location || payload.pickup_area || "kk1";
  const category = payload.category || "others";
  const contactMethod = payload.contact_method || "in_app";
  return {
    ...payload,
    title: payload.title.trim(),
    description: payload.description?.trim(),
    category,
    condition_label: payload.condition_label || payload.condition || "good",
    price: category === "free_items" ? 0 : Number(payload.price || 0),
    currency: payload.currency || "MYR",
    pickup_location: pickupLocation,
    pickup_area: pickupLocation,
    contact_method: contactMethod,
    contact_value: contactMethod === "telegram" || contactMethod === "whatsapp" ? payload.contact_value?.trim() : undefined,
  };
}

function validateManualListing(payload: ListingPayload, profile: CurrentProfile | null): string | null {
  const prepared = prepareListingPayload(payload);
  if (!isProfileComplete(profile)) {
    return "Complete your trade profile before publishing.";
  }
  if (prepared.title.length < 5 || prepared.title.length > 100) {
    return "Title must be 5 to 100 characters.";
  }
  if (!prepared.description || prepared.description.length < 10 || prepared.description.length > 2000) {
    return "Description must be 10 to 2000 characters.";
  }
  if (!prepared.category) {
    return "Choose a category.";
  }
  if (!prepared.condition_label) {
    return "Choose a condition.";
  }
  if (!prepared.pickup_location) {
    return "Choose a pickup location.";
  }
  if (prepared.price < 0) {
    return "Price must be 0 or more.";
  }
  if (!isContactReady(prepared)) {
    return "Choose a contact method. Telegram and WhatsApp need a contact value before publishing.";
  }
  return null;
}

function isContactReady(payload: ListingPayload): boolean {
  const method = payload.contact_method || "in_app";
  if (method === "telegram" || method === "whatsapp") {
    return Boolean(payload.contact_value?.trim());
  }
  return true;
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M12 16V4m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m5 12 14-7-4 14-3-5-7-2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="m12 14 7-9" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
