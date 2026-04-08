"""Party management service — CRUD with uniqueness enforcement."""

from sqlalchemy.orm import Session

from app.models.party import Party
from app.repositories import party_repository


class PartyServiceError(Exception):
    pass


def create_party(
    db: Session,
    *,
    name: str,
    abbreviation: str,
    name_ne: str | None = None,
    symbol_description: str | None = None,
    registration_number: str | None = None,
    address: str | None = None,
    established_date=None,
) -> Party:
    if party_repository.get_by_name(db, name):
        raise PartyServiceError(f"Party with name '{name}' already exists")
    if party_repository.get_by_abbreviation(db, abbreviation):
        raise PartyServiceError(f"Party with abbreviation '{abbreviation}' already exists")

    party = Party(
        name=name,
        name_ne=name_ne,
        abbreviation=abbreviation.upper(),
        symbol_description=symbol_description,
        registration_number=registration_number,
        address=address,
        established_date=established_date,
    )
    party_repository.create(db, party)
    db.commit()
    db.refresh(party)
    return party


def update_party(
    db: Session,
    party: Party,
    *,
    name: str | None = None,
    abbreviation: str | None = None,
    name_ne=...,
    symbol_description=...,
    registration_number=...,
    address=...,
    established_date=...,
    is_active: bool | None = None,
) -> Party:
    if name is not None and name != party.name:
        existing = party_repository.get_by_name(db, name)
        if existing:
            raise PartyServiceError(f"Party with name '{name}' already exists")
        party.name = name
    if abbreviation is not None and abbreviation.upper() != party.abbreviation:
        existing = party_repository.get_by_abbreviation(db, abbreviation.upper())
        if existing:
            raise PartyServiceError(f"Party with abbreviation '{abbreviation}' already exists")
        party.abbreviation = abbreviation.upper()
    if name_ne is not ...:
        party.name_ne = name_ne
    if symbol_description is not ...:
        party.symbol_description = symbol_description
    if registration_number is not ...:
        party.registration_number = registration_number
    if address is not ...:
        party.address = address
    if established_date is not ...:
        party.established_date = established_date
    if is_active is not None:
        party.is_active = is_active
    db.commit()
    db.refresh(party)
    return party


def delete_party(db: Session, party: Party) -> None:
    from app.models.fptp_candidate_nomination import FptpCandidateNomination
    from app.models.pr_party_submission import PrPartySubmission
    from sqlalchemy import select, func

    nom_count = db.execute(
        select(func.count()).select_from(FptpCandidateNomination)
        .where(FptpCandidateNomination.party_id == party.id)
    ).scalar_one()
    if nom_count > 0:
        raise PartyServiceError(
            f"Cannot delete party: {nom_count} FPTP nomination(s) reference it"
        )

    sub_count = db.execute(
        select(func.count()).select_from(PrPartySubmission)
        .where(PrPartySubmission.party_id == party.id)
    ).scalar_one()
    if sub_count > 0:
        raise PartyServiceError(
            f"Cannot delete party: {sub_count} PR submission(s) reference it"
        )

    party_repository.delete(db, party)
    db.commit()
