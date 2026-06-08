const designChallenges = [
  {
    id: "senior_login",
    title: "Senior Citizen Login",
    description: "This login screen is confusing and difficult to use. Redesign it to be highly accessible and user-friendly for senior citizens (aged 65+).",
    difficulty: "Medium",
    category: "Accessibility",
    targetAudience: "Senior Citizens (65+)",
    goals: [
      "Improve text and button contrast (minimum 4.5:1 ratio)",
      "Increase typography size to be highly readable (at least 16px for body/inputs, 24px+ for headers)",
      "Ensure touch targets are large enough (minimum 48px height)",
      "Provide clear instructions and helpful labels",
      "Remove distracting or confusing decorative elements"
    ],
    initialDesign: {
      id: "root",
      type: "container",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          padding: "12px",
          backgroundColor: "#1e1e1e",
          borderRadius: "4px",
          alignItems: "stretch",
          gap: "8px",
          width: "100%",
          maxWidth: "400px"
        }
      },
      children: [
        {
          id: "header_container",
          type: "container",
          props: {
            style: {
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "4px",
              backgroundColor: "transparent"
            }
          },
          children: [
            {
              id: "logo_text",
              type: "text",
              text: "DD_AUTH_V2",
              props: {
                style: {
                  fontSize: "10px",
                  color: "#555555",
                  fontWeight: "bold"
                }
              }
            },
            {
              id: "close_btn",
              type: "button",
              text: "X",
              props: {
                style: {
                  fontSize: "8px",
                  color: "#888888",
                  backgroundColor: "#2e2e2e",
                  padding: "4px",
                  borderRadius: "2px",
                  width: "20px",
                  height: "20px"
                }
              }
            }
          ]
        },
        {
          id: "title",
          type: "text",
          text: "AUTHENTICATION SYSTEM ACCESS",
          props: {
            style: {
              fontSize: "13px",
              color: "#38bdf8",
              fontWeight: "bold",
              textAlign: "center",
              margin: "12px 0px"
            }
          }
        },
        {
          id: "desc",
          type: "text",
          text: "Enter credentials. Session cookies will expire in 15 minutes. Ensure CAPS LOCK is disabled before proceeding.",
          props: {
            style: {
              fontSize: "9px",
              color: "#6b7280",
              textAlign: "center",
              margin: "0px 0px 8px 0px"
            }
          }
        },
        {
          id: "email_label",
          type: "text",
          text: "E-MAIL ADDRESS:",
          props: {
            style: {
              fontSize: "9px",
              color: "#9ca3af",
              fontWeight: "bold"
            }
          }
        },
        {
          id: "email_input",
          type: "input",
          text: "",
          props: {
            placeholder: "name@domain.com",
            style: {
              fontSize: "11px",
              color: "#ffffff",
              backgroundColor: "#111111",
              padding: "6px",
              borderRadius: "3px",
              borderWidth: "1px",
              borderColor: "#333333",
              height: "32px"
            }
          }
        },
        {
          id: "password_label",
          type: "text",
          text: "PASSWORD:",
          props: {
            style: {
              fontSize: "9px",
              color: "#9ca3af",
              fontWeight: "bold",
              margin: "8px 0px 0px 0px"
            }
          }
        },
        {
          id: "password_input",
          type: "input",
          text: "",
          props: {
            placeholder: "••••••••",
            style: {
              fontSize: "11px",
              color: "#ffffff",
              backgroundColor: "#111111",
              padding: "6px",
              borderRadius: "3px",
              borderWidth: "1px",
              borderColor: "#333333",
              height: "32px"
            }
          }
        },
        {
          id: "btn_container",
          type: "container",
          props: {
            style: {
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
              padding: "8px 0px",
              gap: "8px"
            }
          },
          children: [
            {
              id: "forgot_link",
              type: "text",
              text: "Forgot?",
              props: {
                style: {
                  fontSize: "10px",
                  color: "#4b5563",
                  textAlign: "right"
                }
              }
            },
            {
              id: "submit_btn",
              type: "button",
              text: "LOG IN",
              props: {
                style: {
                  fontSize: "11px",
                  color: "#1e293b",
                  backgroundColor: "#38bdf8",
                  fontWeight: "bold",
                  padding: "6px 12px",
                  borderRadius: "3px",
                  height: "32px"
                }
              }
            }
          ]
        }
      ]
    }
  },
  {
    id: "ecommerce_checkout",
    title: "High-Conversion Checkout",
    description: "This checkout page has terrible conversion. The checkout button is hidden, red (indicating errors), and pricing is completely confusing. Fix it to drive sales.",
    difficulty: "Hard",
    category: "Conversion",
    targetAudience: "Online shoppers",
    goals: [
      "Establish a clear primary call-to-action (CTA) for checkout (green/indigo, prominent, full-width)",
      "Clarify the pricing breakdown (subtotal, shipping, taxes, total) with clear typographic hierarchy",
      "Highlight the total amount prominently",
      "Add reassuring checkout elements (e.g. security badge, satisfaction guarantee)",
      "Create clean, structured input forms for card details"
    ],
    initialDesign: {
      id: "root",
      type: "container",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          padding: "16px",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          gap: "16px",
          width: "100%",
          maxWidth: "450px"
        }
      },
      children: [
        {
          id: "header",
          type: "text",
          text: "TERMS OF AGREEMENT & BILLING DETAILS",
          props: {
            style: {
              fontSize: "12px",
              color: "#333333",
              fontWeight: "bold",
              textAlign: "center"
            }
          }
        },
        {
          id: "fine_print",
          type: "text",
          text: "By clicking purchase you agree to our 45-page service agreement, recurring membership fee of $49/mo, standard handling policies, and consent to electronic communication. All sales are final and non-refundable.",
          props: {
            style: {
              fontSize: "8px",
              color: "#999999",
              margin: "0px 0px 8px 0px"
            }
          }
        },
        {
          id: "pricing_card",
          type: "container",
          props: {
            style: {
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              padding: "8px",
              backgroundColor: "#f3f4f6",
              borderRadius: "4px"
            }
          },
          children: [
            {
              id: "pricing_labels",
              type: "text",
              text: "Subtotal: $120.00 | Shipping: $15.00 | Est. Tax: $10.00 | Total due: $145.00",
              props: {
                style: {
                  fontSize: "10px",
                  color: "#4b5563"
                }
              }
            }
          ]
        },
        {
          id: "card_details_label",
          type: "text",
          text: "CREDIT CARD DETAIL INFORMATION",
          props: {
            style: {
              fontSize: "9px",
              color: "#777777",
              fontWeight: "bold"
            }
          }
        },
        {
          id: "inputs_row",
          type: "container",
          props: {
            style: {
              display: "flex",
              flexDirection: "row",
              gap: "8px"
            }
          },
          children: [
            {
              id: "card_num",
              type: "input",
              text: "",
              props: {
                placeholder: "Card Number",
                style: {
                  fontSize: "11px",
                  color: "#333333",
                  backgroundColor: "#ffffff",
                  padding: "8px",
                  borderRadius: "4px",
                  borderWidth: "1px",
                  borderColor: "#d1d5db",
                  width: "60%"
                }
              }
            },
            {
              id: "card_expiry",
              type: "input",
              text: "",
              props: {
                placeholder: "MM/YY",
                style: {
                  fontSize: "11px",
                  color: "#333333",
                  backgroundColor: "#ffffff",
                  padding: "8px",
                  borderRadius: "4px",
                  borderWidth: "1px",
                  borderColor: "#d1d5db",
                  width: "20%"
                }
              }
            },
            {
              id: "card_cvc",
              type: "input",
              text: "",
              props: {
                placeholder: "CVC",
                style: {
                  fontSize: "11px",
                  color: "#333333",
                  backgroundColor: "#ffffff",
                  padding: "8px",
                  borderRadius: "4px",
                  borderWidth: "1px",
                  borderColor: "#d1d5db",
                  width: "20%"
                }
              }
            }
          ]
        },
        {
          id: "footer_row",
          type: "container",
          props: {
            style: {
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center"
            }
          },
          children: [
            {
              id: "cancel_btn",
              type: "button",
              text: "CANCEL ORDER AND DELETE CART",
              props: {
                style: {
                  fontSize: "9px",
                  color: "#ffffff",
                  backgroundColor: "#4b5563",
                  padding: "8px 12px",
                  borderRadius: "4px"
                }
              }
            },
            {
              id: "submit_btn",
              type: "button",
              text: "BUY NOW (WARNING)",
              props: {
                style: {
                  fontSize: "9px",
                  color: "#ffffff",
                  backgroundColor: "#ef4444",
                  fontWeight: "bold",
                  padding: "8px 12px",
                  borderRadius: "4px"
                }
              }
            }
          ]
        }
      ]
    }
  },
  {
    id: "analytics_card",
    title: "Analytics Dashboard Card",
    description: "This metrics card has poor visual hierarchy. The spacing is crammed, the primary number is small, and there is too much visual clutter. Redesign it to look like a premium dashboard widget.",
    difficulty: "Easy",
    category: "Hierarchy",
    targetAudience: "Business Executives",
    goals: [
      "Create clear typographical hierarchy (large metric, small secondary label)",
      "Establish proper padding and spacing (generous card padding, margin below label)",
      "Highlight the growth trend (green positive indicator, red negative)",
      "Clean up alignment (align-left or well-spaced grid)",
      "Use premium dark/light mode background and borders (subtle shadows or thin borders)"
    ],
    initialDesign: {
      id: "root",
      type: "container",
      props: {
        style: {
          display: "flex",
          flexDirection: "row",
          padding: "4px",
          backgroundColor: "#111827",
          borderRadius: "0px",
          gap: "2px",
          width: "100%",
          maxWidth: "350px",
          borderWidth: "2px",
          borderColor: "#ff00ff"
        }
      },
      children: [
        {
          id: "left_col",
          type: "container",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              padding: "2px"
            }
          },
          children: [
            {
              id: "title_label",
              type: "text",
              text: "DAILY REVENUE METRIC CHARTING FOR CURRENT FISCAL PERIOD",
              props: {
                style: {
                  fontSize: "14px",
                  color: "#ffffff",
                  fontWeight: "bold"
                }
              }
            },
            {
              id: "growth_stat",
              type: "text",
              text: "+14.2% OVER LAST DAY",
              props: {
                style: {
                  fontSize: "12px",
                  color: "#00ff00"
                }
              }
            }
          ]
        },
        {
          id: "right_col",
          type: "container",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-end",
              padding: "2px"
            }
          },
          children: [
            {
              id: "main_val",
              type: "text",
              text: "$1,452.20",
              props: {
                style: {
                  fontSize: "11px",
                  color: "#3b82f6",
                  fontWeight: "bold"
                }
              }
            },
            {
              id: "time_tag",
              type: "text",
              text: "LAST UPDATED: 2 MINS AGO",
              props: {
                style: {
                  fontSize: "6px",
                  color: "#9ca3af"
                }
              }
            }
          ]
        }
      ]
    }
  },
  {
    id: "mobile_onboarding",
    title: "Mobile Onboarding Screen",
    description: "This onboarding screen is built for desktops, making it hard to read and interact with on mobile. Reposition the interactive elements for thumbs and refine the styling.",
    difficulty: "Medium",
    category: "Mobile UX",
    targetAudience: "Mobile app users",
    goals: [
      "Ensure all buttons are easily reachable by thumbs (lower half of screen)",
      "Set input and button heights to at least 48px to allow easy tapping",
      "Center-align titles and descriptive texts for mobile balance",
      "Differentiate primary Action (e.g. Next Step) from secondary Action (e.g. Skip)",
      "Add clean visual spacing and remove horizontal crowding"
    ],
    initialDesign: {
      id: "root",
      type: "container",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          padding: "12px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          gap: "24px",
          width: "100%",
          maxWidth: "360px",
          height: "500px",
          justifyContent: "space-between"
        }
      },
      children: [
        {
          id: "top_actions",
          type: "container",
          props: {
            style: {
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center"
            }
          },
          children: [
            {
              id: "progress_dot",
              type: "text",
              text: "STEP 1 OF 3",
              props: {
                style: {
                  fontSize: "10px",
                  color: "#9ca3af",
                  fontWeight: "bold"
                }
              }
            },
            {
              id: "skip_btn",
              type: "button",
              text: "Skip Setup",
              props: {
                style: {
                  fontSize: "10px",
                  color: "#6b7280",
                  backgroundColor: "#f3f4f6",
                  padding: "4px 8px",
                  borderRadius: "4px"
                }
              }
            }
          ]
        },
        {
          id: "content_group",
          type: "container",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              padding: "0px 12px"
            }
          },
          children: [
            {
              id: "title",
              type: "text",
              text: "Customize Your Feed",
              props: {
                style: {
                  fontSize: "28px",
                  color: "#111827",
                  fontWeight: "bold"
                }
              }
            },
            {
              id: "subtitle",
              type: "text",
              text: "Choose the topics you are interested in. We will currate your daily dashboard feeds to match these selections.",
              props: {
                style: {
                  fontSize: "12px",
                  color: "#4b5563"
                }
              }
            },
            {
              id: "interest_input",
              type: "input",
              text: "",
              props: {
                placeholder: "Search topics (e.g. React, Next.js)",
                style: {
                  fontSize: "12px",
                  color: "#1f2937",
                  backgroundColor: "#f9fafb",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  borderWidth: "1px",
                  borderColor: "#d1d5db"
                }
              }
            }
          ]
        },
        {
          id: "bottom_nav",
          type: "container",
          props: {
            style: {
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
              padding: "8px"
            }
          },
          children: [
            {
              id: "next_btn",
              type: "button",
              text: "->",
              props: {
                style: {
                  fontSize: "16px",
                  color: "#ffffff",
                  backgroundColor: "#111827",
                  fontWeight: "bold",
                  padding: "8px 16px",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }
              }
            }
          ]
        }
      ]
    }
  },
  {
    id: "newsletter_form",
    title: "Newsletter Subscription Form",
    description: "This email sign-up box fails to attract subscribers. The color choices are poor, typography is chaotic, and there is no sense of trust. Redesign it to maximize sign-ups.",
    difficulty: "Easy",
    category: "Layout & Colors",
    targetAudience: "Casual readers",
    goals: [
      "Select a professional and warm color scheme with high contrast text",
      "Highlight the subscription benefit clearly (e.g. 'Get weekly developer tips')",
      "Style the email text field to look neat and clean",
      "Style the CTA button to stand out (bold text, clear hover style, high contrast)",
      "Include a small assurance label about privacy/no spam"
    ],
    initialDesign: {
      id: "root",
      type: "container",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          padding: "24px",
          backgroundColor: "#1e3a8a",
          borderRadius: "4px",
          gap: "12px",
          width: "100%",
          maxWidth: "400px"
        }
      },
      children: [
        {
          id: "headline",
          type: "text",
          text: "ENTER EMAIL HERE FOR STUFF",
          props: {
            style: {
              fontSize: "14px",
              color: "#3b82f6",
              fontWeight: "bold",
              textAlign: "center"
            }
          }
        },
        {
          id: "sub_headline",
          type: "text",
          text: "We send emails weekly. You can opt out anytime you want using the link at the bottom of the emails.",
          props: {
            style: {
              fontSize: "11px",
              color: "#1d4ed8",
              textAlign: "center"
            }
          }
        },
        {
          id: "email_input",
          type: "input",
          text: "",
          props: {
            placeholder: "Type mail",
            style: {
              fontSize: "12px",
              color: "#ffffff",
              backgroundColor: "#1e3a8a",
              padding: "4px",
              borderRadius: "0px",
              borderWidth: "1px",
              borderColor: "#1d4ed8",
              textAlign: "center"
            }
          }
        },
        {
          id: "submit_btn",
          type: "button",
          text: "SUBMIT REQUEST",
          props: {
            style: {
              fontSize: "10px",
              color: "#1e3a8a",
              backgroundColor: "#1d4ed8",
              fontWeight: "bold",
              padding: "8px",
              borderRadius: "2px"
            }
          }
        }
      ]
    }
  },
  {
    id: "cookie_consent",
    title: "Cookie Consent Banner",
    description: "This banner uses dark patterns and poor aesthetics. Redesign it to respect user choice, offer clear options (Accept vs Decline), and look clean.",
    difficulty: "Medium",
    category: "Ethics & UI",
    targetAudience: "Website visitors",
    goals: [
      "Establish equal visual weight or clear options for both Accept and Reject",
      "Use highly legible typography and descriptive descriptions",
      "Implement a sleek layout (e.g. horizontal bar or elegant card)",
      "Provide clean border details and professional branding contrast",
      "Avoid deceptive sizing/colors designed to force clicks"
    ],
    initialDesign: {
      id: "root",
      type: "container",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          padding: "8px",
          backgroundColor: "#000000",
          borderRadius: "0px",
          gap: "8px",
          width: "100%",
          maxWidth: "480px",
          borderWidth: "3px",
          borderColor: "#ff0000"
        }
      },
      children: [
        {
          id: "title",
          type: "text",
          text: "WE VALU YOUR COOKIES & PRIVACY!!",
          props: {
            style: {
              fontSize: "11px",
              color: "#ff0000",
              fontWeight: "bold"
                }
              }
        },
        {
          id: "body_text",
          type: "text",
          text: "We and our partners use cookies to store information, track advertising data, optimize site loading, build profiles, sell data, and track browsing history.",
          props: {
            style: {
              fontSize: "9px",
              color: "#666666"
            }
          }
        },
        {
          id: "btn_group",
          type: "container",
          props: {
            style: {
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "4px"
            }
          },
          children: [
            {
              id: "reject_btn",
              type: "button",
              text: "no",
              props: {
                style: {
                  fontSize: "8px",
                  color: "#333333",
                  backgroundColor: "transparent",
                  padding: "2px"
                }
              }
            },
            {
              id: "accept_btn",
              type: "button",
              text: "ACCEPT ALL COOKIES AND AGREE TO TRACKING AND DATA HARVESTING",
              props: {
                style: {
                  fontSize: "12px",
                  color: "#ffffff",
                  backgroundColor: "#22c55e",
                  fontWeight: "bold",
                  padding: "12px 24px",
                  borderRadius: "8px"
                }
              }
            }
          ]
        }
      ]
    }
  }
];

module.exports = {
  designChallenges
};
